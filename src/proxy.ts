import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

function resolveAuthSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('AUTH_SECRET environment variable is required in production');
    }
    return 'schoolfinder-dev-secret-change-in-production';
  }
  return s;
}

const secret = () => new TextEncoder().encode(resolveAuthSecret());

function normalizeRole(role: string | null): string {
  if (!role) return 'guest';
  if (role === 'parent') return 'user';
  if (role === 'school_admin') return 'school';
  return role;
}

async function getRole(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return normalizeRole((payload.role as string) || null);
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('sf_token')?.value;

  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      return NextResponse.redirect(new URL(`/auth/login?redirect=${encodeURIComponent(pathname)}`, request.url));
    }

    const role = await getRole(token);
    if (role !== 'school') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  if (pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL(`/auth/login?redirect=${encodeURIComponent(pathname)}`, request.url));
    }

    const role = await getRole(token);
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
