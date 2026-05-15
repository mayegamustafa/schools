import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

interface RevenueRow {
  plan: string;
  count: number;
  revenue: number;
}

export async function GET(request: Request) {
  const auth = await requireAuth(request, ['admin']);
  if ('response' in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') || '').trim();
  const status = searchParams.get('status') || 'all';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const schoolWhere: any = {};
  if (status !== 'all') schoolWhere.status = status;
  if (query) {
    schoolWhere.OR = [
      { name: { contains: query } },
      { city: { contains: query } },
      { region: { contains: query } },
      { type: { contains: query } },
    ];
  }

  const now = new Date();
  const activeSubscriptionWhere = {
    status: 'active',
    OR: [
      { periodEnd: null },
      { periodEnd: { gte: now } },
    ],
  };

  const [
    totalSchools,
    totalUsers,
    totalReviews,
    pendingApprovals,
    flaggedReviews,
    activeSubscriptions,
    schools,
    pendingSchools,
    reviews,
    users,
  ] = await Promise.all([
    prisma.school.count(),
    prisma.user.count(),
    prisma.review.count(),
    prisma.school.count({ where: { status: 'pending' } }),
    prisma.review.count({ where: { rating: { lte: 2 } } }),
    prisma.schoolSubscription.findMany({
      where: activeSubscriptionWhere,
      include: { plan: true },
    }),
    prisma.school.findMany({
      where: schoolWhere,
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    prisma.school.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.review.findMany({
      orderBy: { createdAt: 'desc' },
      include: { school: true },
      take: 50,
    }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ]);

  const revenueByPlan = new Map<string, RevenueRow>();
  let totalRevenue = 0;

  for (const subscription of activeSubscriptions) {
    const key = subscription.plan.name;
    const current = revenueByPlan.get(key) || { plan: key, count: 0, revenue: 0 };
    current.count += 1;
    current.revenue += subscription.plan.price;
    totalRevenue += subscription.plan.price;
    revenueByPlan.set(key, current);
  }

  const activeCutoff = new Date(Date.now() - 1000 * 60 * 60 * 24 * 90);

  return NextResponse.json({
    stats: {
      totalSchools,
      totalUsers,
      totalReviews,
      pendingApprovals,
      flaggedReviews,
      activeSubscriptions: activeSubscriptions.length,
      totalRevenue,
    },
    pendingSchools: pendingSchools.map(school => ({
      id: school.id,
      slug: school.slug,
      name: school.name,
      city: school.city,
      country: school.country,
      createdAt: school.createdAt.toISOString(),
    })),
    schools: schools.map(school => ({
      id: school.id,
      slug: school.slug,
      name: school.name,
      city: school.city,
      type: school.type,
      rating: school.rating,
      isVerified: school.isVerified,
      status: school.status,
      plan: school.subscription?.plan.name || (school.isPremium ? 'Premium' : 'Basic'),
      createdAt: school.createdAt.toISOString(),
    })),
    reviews: reviews.map(review => ({
      id: review.id,
      author: review.userName,
      school: review.school?.name || 'Unknown School',
      rating: review.rating,
      comment: review.content,
      flagged: review.rating <= 2,
      createdAt: review.createdAt.toISOString(),
    })),
    users: users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      joined: user.createdAt.toISOString(),
      active: user.createdAt >= activeCutoff,
    })),
    revenueBreakdown: Array.from(revenueByPlan.values()).sort((a, b) => b.revenue - a.revenue),
  });
}
