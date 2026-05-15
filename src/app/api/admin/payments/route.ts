import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request: Request) {
  const auth = await requireAuth(request, ['admin']);
  if ('response' in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'));
  const status = searchParams.get('status');
  const q = (searchParams.get('q') || '').trim();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (status && status !== 'all') where.status = status;
  if (q) {
    where.school = { name: { contains: q } };
  }

  const [subscriptions, total] = await Promise.all([
    prisma.schoolSubscription.findMany({
      where,
      include: {
        school: { select: { id: true, name: true, slug: true, city: true } },
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.schoolSubscription.count({ where }),
  ]);

  const now = new Date();

  const totalActiveRevenue = await prisma.schoolSubscription.findMany({
    where: {
      status: 'active',
      OR: [{ periodEnd: null }, { periodEnd: { gte: now } }],
    },
    include: { plan: true },
  });

  const monthlyRevenue = totalActiveRevenue.reduce((sum, s) => {
    const price = s.plan.price;
    return sum + (s.plan.period === 'yearly' ? Math.round(price / 12) : price);
  }, 0);

  const totalRevenue = totalActiveRevenue.reduce((sum, s) => sum + s.plan.price, 0);

  const revenueByPlan = new Map<string, { plan: string; count: number; revenue: number; period: string }>();
  for (const s of totalActiveRevenue) {
    const key = s.plan.name;
    const cur = revenueByPlan.get(key) || { plan: key, count: 0, revenue: 0, period: s.plan.period };
    cur.count += 1;
    cur.revenue += s.plan.price;
    revenueByPlan.set(key, cur);
  }

  // Build last 6 months revenue series
  const monthlyTrend = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(now);
    d.setMonth(now.getMonth() - (5 - i));
    const label = d.toLocaleString('default', { month: 'short' });
    // Approximate by active subscriptions created before end of that month
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const count = totalActiveRevenue.filter(s => new Date(s.createdAt) <= endOfMonth).length;
    return { month: label, revenue: count * (monthlyRevenue / Math.max(totalActiveRevenue.length, 1)) };
  });

  return NextResponse.json({
    subscriptions: subscriptions.map(s => ({
      id: s.id,
      schoolId: s.schoolId,
      schoolName: s.school.name,
      schoolCity: s.school.city,
      planName: s.plan.name,
      planPrice: s.plan.price,
      planPeriod: s.plan.period,
      currency: s.plan.currency,
      status: s.status,
      periodStart: s.periodStart.toISOString(),
      periodEnd: s.periodEnd?.toISOString() || null,
      autoRenew: s.autoRenew,
      createdAt: s.createdAt.toISOString(),
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
    summary: {
      totalRevenue,
      monthlyRevenue,
      activeCount: totalActiveRevenue.length,
      revenueByPlan: Array.from(revenueByPlan.values()).sort((a, b) => b.revenue - a.revenue),
      monthlyTrend,
    },
  });
}
