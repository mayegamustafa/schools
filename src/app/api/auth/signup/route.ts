import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashSync } from 'bcryptjs';
import { createAuthToken, normalizeRole } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const COOKIE_MAX_AGE = 60 * 60 * 24;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    if (!EMAIL_RULE.test(String(email).trim())) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }

    if (String(name).trim().length < 2) {
      return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 });
    }

    if (!PASSWORD_RULE.test(String(password))) {
      return NextResponse.json(
        { error: 'Password must be 8+ chars and include uppercase, lowercase, and a number' },
        { status: 400 }
      );
    }

    const requestedRole = normalizeRole(String(role || 'user'));
    const userRole = requestedRole === 'school' ? 'school' : 'user';
    const normalizedEmail = String(email).trim().toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    const newUser = await prisma.user.create({
      data: {
        name: String(name).slice(0, 100),
        email: normalizedEmail,
        password: hashSync(String(password), 10),
        role: userRole,
      },
    });

    const token = await createAuthToken({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: userRole,
    });

    let parsedFavorites: string[] = [];
    try {
      parsedFavorites = JSON.parse(newUser.favorites);
    } catch {
      parsedFavorites = [];
    }

    const response = NextResponse.json({
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: userRole,
        avatar: newUser.avatar,
        favorites: parsedFavorites,
      },
      token,
    }, { status: 201 });

    response.cookies.set('sf_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    });

    await logAudit(newUser.id, newUser.name, 'auth.signup', 'user', newUser.id, {
      role: userRole,
      email: newUser.email,
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
  }
}
