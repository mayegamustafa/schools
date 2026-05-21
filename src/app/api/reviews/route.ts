import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serializeReview } from '@/lib/serialize';
import { requireAuth } from '@/lib/auth';

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
  const auth = await requireAuth(request, ['user', 'school', 'admin']);
  if ('response' in auth) return auth.response;

  const body = await request.json();
  const { schoolId, rating, title, content } = body;

  if (!schoolId || !rating || !title || !content) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const ratingNum = Number(rating);
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return NextResponse.json({ error: 'Rating must be a whole number between 1 and 5' }, { status: 400 });
  }

  if (String(title).trim().length < 3) {
    return NextResponse.json({ error: 'Title must be at least 3 characters' }, { status: 400 });
  }
  if (String(content).trim().length < 10) {
    return NextResponse.json({ error: 'Review must be at least 10 characters' }, { status: 400 });
  }

  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 });
  }

  const review = await prisma.review.create({
    data: {
      schoolId,
      userId: auth.claims.sub,
      userName: auth.claims.name.slice(0, 100),
      rating: ratingNum,
      title: String(title).trim().slice(0, 200),
      content: String(content).trim().slice(0, 2000),
    },
  });

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
