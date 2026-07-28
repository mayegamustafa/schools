import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

const MAX_FAVORITES = 200;

/**
 * Persists a user's saved schools.
 *
 * User.favorites has existed since the first migration but nothing ever wrote to
 * it — saved schools lived in React state and vanished on refresh.
 */
export async function PUT(request: Request) {
  const auth = await requireAuth(request, ['user', 'school', 'admin']);
  if ('response' in auth) return auth.response;

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.favorites)) {
    return NextResponse.json({ error: 'favorites must be an array' }, { status: 400 });
  }

  const ids: string[] = [
    ...new Set(
      (body.favorites as unknown[])
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
        .slice(0, MAX_FAVORITES)
    ),
  ];

  // Drop ids that don't resolve to a school, so a stale client can't grow the
  // list with junk.
  const existing = await prisma.school.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });
  const valid = existing.map(school => school.id);

  await prisma.user.update({
    where: { id: auth.claims.sub },
    data: { favorites: JSON.stringify(valid) },
  });

  return NextResponse.json({ favorites: valid });
}
