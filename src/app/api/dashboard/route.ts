import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (minutes < 60) return `${Math.max(1, minutes)} minute${minutes === 1 ? '' : 's'} ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export async function GET(request: Request) {
  const auth = await requireAuth(request, ['school']);
  if ('response' in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get('schoolId');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  where.ownerUserId = auth.claims.sub;
  if (schoolId) {
    where.id = schoolId;
  }

  const school = await prisma.school.findFirst({
    where,
    include: {
      subscription: {
        include: {
          plan: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!school) {
    return NextResponse.json({ error: 'No school profile found for this account' }, { status: 404 });
  }

  const now = new Date();
  const last30 = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30);
  const prev30 = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 60);

  const [
    recentLeadCount,
    previousLeadCount,
    totalLeadCount,
    reviews,
    leads,
    payments,
    totalViews,
    totalClicks,
    recentViewCount,
    previousViewCount,
    recentClickCount,
    previousClickCount,
    viewsBySource,
    topReferrerRows,
  ] = await Promise.all([
    prisma.lead.count({
      where: {
        schoolId: school.id,
        createdAt: { gte: last30 },
      },
    }),
    prisma.lead.count({
      where: {
        schoolId: school.id,
        createdAt: { gte: prev30, lt: last30 },
      },
    }),
    prisma.lead.count({ where: { schoolId: school.id } }),
    prisma.review.findMany({
      where: { schoolId: school.id },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    prisma.lead.findMany({
      where: { schoolId: school.id },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    prisma.payment.findMany({
      where: { schoolId: school.id },
      orderBy: { paidAt: 'desc' },
      take: 12,
    }),
    prisma.schoolView.count({ where: { schoolId: school.id, kind: 'profile' } }),
    prisma.schoolView.count({ where: { schoolId: school.id, kind: 'contact' } }),
    prisma.schoolView.count({
      where: { schoolId: school.id, kind: 'profile', createdAt: { gte: last30 } },
    }),
    prisma.schoolView.count({
      where: { schoolId: school.id, kind: 'profile', createdAt: { gte: prev30, lt: last30 } },
    }),
    prisma.schoolView.count({
      where: { schoolId: school.id, kind: 'contact', createdAt: { gte: last30 } },
    }),
    prisma.schoolView.count({
      where: { schoolId: school.id, kind: 'contact', createdAt: { gte: prev30, lt: last30 } },
    }),
    prisma.schoolView.groupBy({
      by: ['source'],
      where: { schoolId: school.id, kind: 'profile' },
      _count: { _all: true },
    }),
    prisma.schoolView.groupBy({
      by: ['referrer'],
      where: { schoolId: school.id, kind: 'profile', referrer: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { referrer: 'desc' } },
      take: 8,
    }),
  ]);

  // Every figure below is a real count from SchoolView. These used to be derived
  // arithmetically from reviewCount — schools were being shown invented numbers
  // for the listing they pay for.
  const totalMessages = totalLeadCount;

  const viewsTrend = percentChange(recentViewCount, previousViewCount);
  const clicksTrend = percentChange(recentClickCount, previousClickCount);
  const messagesTrend = percentChange(recentLeadCount, previousLeadCount);

  const recentActivity = [
    ...(totalViews > 0
      ? [{
          type: 'view',
          message: `Your profile has ${totalViews} view${totalViews === 1 ? '' : 's'}.`,
          time: timeAgo(school.updatedAt),
        }]
      : []),
    ...leads.slice(0, 4).map(lead => ({
      type: 'message',
      message: `New inquiry from ${lead.name}.`,
      time: timeAgo(lead.createdAt),
    })),
    ...reviews.slice(0, 4).map(review => ({
      type: 'review',
      message: `New review from ${review.userName} (${review.rating} stars).`,
      time: timeAgo(review.createdAt),
    })),
  ].slice(0, 8);

  const subscription = school.subscription?.plan
    ? {
        planName: school.subscription.plan.name,
        amount: school.subscription.plan.price,
        currency: school.subscription.plan.currency,
        period: school.subscription.plan.period,
        status: school.subscription.status,
        nextBillingDate: school.subscription.periodEnd?.toISOString() || null,
      }
    : null;

  const paymentHistory = payments.map(payment => ({
    date: payment.paidAt.toISOString(),
    amount: payment.amount,
    status: payment.status,
  }));

  const sourceLabels: Record<string, string> = {
    direct: 'Direct',
    search: 'Search engines',
    social: 'Social media',
    referral: 'Referrals',
  };

  // Real referrer breakdown. Returns an empty array until traffic exists, rather
  // than inventing a plausible-looking split.
  const sourceTotal = viewsBySource.reduce((sum, row) => sum + row._count._all, 0);
  const visitorSources = sourceTotal === 0
    ? []
    : viewsBySource
        .map(row => ({
          source: sourceLabels[row.source] || row.source,
          pct: Math.round((row._count._all / sourceTotal) * 100),
        }))
        .sort((a, b) => b.pct - a.pct);

  // Referring pages that actually sent traffic, in place of the fabricated
  // "top search terms" list. Real query terms would need Search Console.
  const topReferrers = topReferrerRows
    .filter(row => row.referrer)
    .map(row => {
      let label = row.referrer as string;
      try {
        label = new URL(label).hostname.replace(/^www\./, '');
      } catch {
        // Keep the raw value if it isn't a parseable URL.
      }
      return { term: label, views: row._count._all };
    })
    .slice(0, 5);

  return NextResponse.json({
    school: {
      id: school.id,
      name: school.name,
      slug: school.slug,
      description: school.description,
      shortDescription: school.shortDescription,
      logo: school.logo,
      coverImage: school.coverImage,
      gallery: JSON.parse(school.gallery || '[]'),
      videos: JSON.parse(school.videos || '[]'),
      phone: school.phone,
      email: school.email,
      website: school.website,
      whatsapp: school.whatsapp,
      address: school.address,
      city: school.city,
      region: school.region,
      country: school.country,
      latitude: school.latitude,
      longitude: school.longitude,
    },
    stats: {
      totalViews,
      totalClicks,
      totalMessages,
      viewsTrend,
      clicksTrend,
      messagesTrend,
    },
    recentActivity,
    subscription,
    paymentHistory,
    analytics: {
      topReferrers,
      visitorSources,
      /** True once any real traffic has been recorded, so the UI can show an
       *  honest empty state instead of zeros that look like a bug. */
      hasData: totalViews > 0,
    },
  });
}
