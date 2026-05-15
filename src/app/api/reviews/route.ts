import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serializeReview } from '@/lib/serialize';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get('schoolId');

  const where = schoolId ? { schoolId } : {};
  const reviews = await prisma.review.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    reviews: reviews.map(serializeReview),
    total: reviews.length,
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { schoolId, rating, title, content, userName } = body;

  if (!schoolId || !rating || !title || !content || !userName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (Number(rating) < 1 || Number(rating) > 5) {
    return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
  }

  // Verify school exists
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 });
  }

  const review = await prisma.review.create({
    data: {
      schoolId,
      userId: 'anonymous',
      userName: String(userName).slice(0, 100),
      rating: Number(rating),
      title: String(title).slice(0, 200),
      content: String(content).slice(0, 2000),
    },
  });

  // Recalculate school rating
  const aggregate = await prisma.review.aggregate({
    where: { schoolId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.school.update({
    where: { id: schoolId },
    data: {
      rating: Math.round((aggregate._avg.rating || 0) * 10) / 10,
      reviewCount: aggregate._count.rating,
    },
  });

  return NextResponse.json({ review: serializeReview(review) }, { status: 201 });
}
