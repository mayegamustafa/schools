import { jwtVerify, SignJWT, type JWTPayload } from 'jose';
import { NextResponse } from 'next/server';

type AuthRole = 'guest' | 'user' | 'school' | 'admin' | string;

export interface AuthClaims extends JWTPayload {
  sub: string;
  email: string;
  role: AuthRole;
  name: string;
}

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: AuthRole;
}

const DEFAULT_DEV_SECRET = 'schoolfinder-dev-secret-change-in-production';

/**
 * Falling back to a hardcoded secret in production would let anyone who has read
 * the source mint a valid admin token. Development keeps the fallback so a fresh
 * clone runs without setup.
 */
function resolveAuthSecret(): string {
  const configured = process.env.AUTH_SECRET;

  if (!configured || configured === DEFAULT_DEV_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'AUTH_SECRET must be set to a unique random value in production. '
        + 'Generate one with: openssl rand -hex 32'
      );
    }
    return DEFAULT_DEV_SECRET;
  }

  if (configured.length < 32 && process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET must be at least 32 characters in production.');
  }

  return configured;
}

const AUTH_SECRET_KEY = new TextEncoder().encode(resolveAuthSecret());

export function normalizeRole(role: string | null | undefined): AuthRole {
  if (!role) return 'guest';
  if (role === 'parent') return 'user';
  if (role === 'school_admin') return 'school';
  return role;
}

export async function createAuthToken(user: AuthUser): Promise<string> {
  const normalizedRole = normalizeRole(user.role);

  return new SignJWT({
    email: user.email,
    role: normalizedRole,
    name: user.name,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(AUTH_SECRET_KEY);
}

export async function verifyAuthToken(token: string): Promise<AuthClaims | null> {
  try {
    const { payload } = await jwtVerify(token, AUTH_SECRET_KEY);
    if (!payload.sub || !payload.email || !payload.role || !payload.name) {
      return null;
    }

    return {
      ...payload,
      role: normalizeRole(String(payload.role)),
    } as AuthClaims;
  } catch {
    return null;
  }
}

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (!header) return null;

  const [scheme, token] = header.split(' ');
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') return null;

  return token.trim();
}

function getCookieToken(request: Request): string | null {
  const rawCookieHeader = request.headers.get('cookie');
  if (!rawCookieHeader) return null;

  const cookieParts = rawCookieHeader.split(';');
  for (const part of cookieParts) {
    const [name, ...valueParts] = part.trim().split('=');
    if (name !== 'sf_token') continue;
    return decodeURIComponent(valueParts.join('='));
  }

  return null;
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Cross-origin write guard.
 *
 * Cookie auth plus sameSite: 'lax' blocks the classic cross-site form POST, but
 * lax still permits some cross-origin requests, and nothing verified the origin.
 * Requests carrying a Bearer token are exempt: those come from the mobile app,
 * which has no Origin header and is not subject to CSRF (an attacker cannot make
 * a victim's app attach its SecureStore token).
 */
function isCrossOriginWrite(request: Request): boolean {
  if (SAFE_METHODS.has(request.method)) return false;
  if (getBearerToken(request)) return false;

  const origin = request.headers.get('origin');
  // Same-origin fetches from older browsers may omit Origin entirely.
  if (!origin) return false;

  // The host must come from the forwarded headers, not request.url. Behind a
  // reverse proxy (Railway, Vercel, any load balancer) request.url carries the
  // *internal* host, so comparing against it rejected every genuine same-origin
  // write from the deployed site.
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = forwardedHost || request.headers.get('host');

  try {
    const originHost = new URL(origin).host;
    if (host) {
      // x-forwarded-host can be a comma-separated chain; the first entry is the
      // host the browser actually addressed.
      const expected = host.split(',')[0].trim();
      return originHost !== expected;
    }
    return originHost !== new URL(request.url).host;
  } catch {
    return true;
  }
}

export async function requireAuth(
  request: Request,
  allowedRoles?: AuthRole[]
): Promise<{ claims: AuthClaims } | { response: NextResponse }> {
  if (isCrossOriginWrite(request)) {
    return {
      response: NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 }),
    };
  }

  // Try both credentials rather than only the first present one: the mobile app
  // sends a Bearer token, the web app relies on the httpOnly cookie, and a stale
  // header shouldn't shadow a valid cookie.
  const candidates = [getBearerToken(request), getCookieToken(request)].filter(
    (value): value is string => Boolean(value)
  );

  if (candidates.length === 0) {
    return {
      response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
    };
  }

  let claims: AuthClaims | null = null;
  for (const candidate of candidates) {
    claims = await verifyAuthToken(candidate);
    if (claims) break;
  }

  if (!claims) {
    return {
      response: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }),
    };
  }

  if (allowedRoles && !allowedRoles.includes(normalizeRole(claims.role))) {
    return {
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { claims };
}