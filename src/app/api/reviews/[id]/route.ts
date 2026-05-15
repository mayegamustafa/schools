import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request, ['admin']);
  if ('response' in auth) return auth.response;

  const { id } = await params;

  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) {
    return NextResponse.json({ error: 'Review not found' }, { status: 404 });
  }

  await prisma.review.delete({ where: { id } });

  // Recalculate school rating after deletion
  const aggregate = await prisma.review.aggregate({
    where: { schoolId: review.schoolId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.school.update({
    where: { id: review.schoolId },
    data: {
      rating: Math.round((aggregate._avg.rating || 0) * 10) / 10,
      reviewCount: aggregate._count.rating,
    },
  });

  return NextResponse.json({ success: true });
}
