import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { compareSync } from 'bcryptjs';
import { createAuthToken, normalizeRole } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

const COOKIE_MAX_AGE = 60 * 60 * 24;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user || !compareSync(String(password), user.password)) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const normalizedRole = normalizeRole(user.role);
    if (normalizedRole !== user.role) {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: normalizedRole },
      });
    }

    const token = await createAuthToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: normalizedRole,
    });

    let parsedFavorites: string[] = [];
    try {
      parsedFavorites = JSON.parse(user.favorites);
    } catch {
      parsedFavorites = [];
    }

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: normalizedRole,
        avatar: user.avatar,
        favorites: parsedFavorites,
      },
      token,
    });

    response.cookies.set('sf_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    });

    await logAudit(user.id, user.name, 'auth.login', 'user', user.id, {
      role: normalizedRole,
      email: user.email,
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
  }
}
