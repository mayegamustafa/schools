import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeRole, requireAuth } from '@/lib/auth';

export async function GET(request: Request) {
  const auth = await requireAuth(request, ['admin', 'school', 'user']);
  if ('response' in auth) return auth.response;

  if (auth.claims.role !== 'admin') {
    const user = await prisma.user.findUnique({ where: { id: auth.claims.sub } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    let favorites: string[] = [];
    try {
      favorites = JSON.parse(user.favorites);
    } catch {
      favorites = [];
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: normalizeRole(user.role),
        avatar: user.avatar,
        favorites,
        createdAt: user.createdAt.toISOString(),
      },
    });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'));
  const q = (searchParams.get('q') || '').trim();
  const role = searchParams.get('role') || 'all';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (role !== 'all') where.role = role;
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { email: { contains: q } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    users: users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: normalizeRole(user.role),
      avatar: user.avatar,
      createdAt: user.createdAt.toISOString(),
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}
