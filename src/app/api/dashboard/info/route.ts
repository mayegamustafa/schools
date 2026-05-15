import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const auth = await requireAuth(request, ['school']);
  if ('response' in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get('schoolId');

  const school = await prisma.school.findFirst({
    where: {
      ownerUserId: auth.claims.sub,
      ...(schoolId ? { id: schoolId } : {}),
    },
    select: { id: true, name: true, slug: true, status: true, isVerified: true, isFeatured: true, isPremium: true },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!school) {
    return NextResponse.json({ error: 'No school found for this account' }, { status: 404 });
  }

  return NextResponse.json(school);
}
