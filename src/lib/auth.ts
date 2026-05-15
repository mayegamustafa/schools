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
const AUTH_SECRET = process.env.AUTH_SECRET || DEFAULT_DEV_SECRET;
const AUTH_SECRET_KEY = new TextEncoder().encode(AUTH_SECRET);

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

function getBearerToken(request: Request): string | null {
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

export async function requireAuth(
  request: Request,
  allowedRoles?: AuthRole[]
): Promise<{ claims: AuthClaims } | { response: NextResponse }> {
  const token = getBearerToken(request) || getCookieToken(request);
  if (!token) {
    return {
      response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
    };
  }

  const claims = await verifyAuthToken(token);
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