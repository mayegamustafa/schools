import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

function toPeriodEnd(period: string, periodStart: Date): Date {
  const next = new Date(periodStart);
  if (period === 'yearly') {
    next.setFullYear(next.getFullYear() + 1);
  } else {
    next.setMonth(next.getMonth() + 1);
  }
  return next;
}

export async function GET(request: Request) {
  const auth = await requireAuth(request, ['admin', 'school']);
  if ('response' in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'));
  const status = searchParams.get('status');
  const schoolId = searchParams.get('schoolId');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (status && status !== 'all') where.status = status;

  if (auth.claims.role === 'school') {
    const school = await prisma.school.findFirst({
      where: { ownerUserId: auth.claims.sub },
      select: { id: true },
    });

    if (!school) return NextResponse.json({ error: 'School profile not found' }, { status: 404 });
    where.schoolId = school.id;
  } else if (schoolId) {
    where.schoolId = schoolId;
  }

  const [subscriptions, total] = await Promise.all([
    prisma.schoolSubscription.findMany({
      where,
      include: {
        school: { select: { id: true, name: true, slug: true } },
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.schoolSubscription.count({ where }),
  ]);

  return NextResponse.json({
    subscriptions: subscriptions.map(sub => ({
      id: sub.id,
      schoolId: sub.schoolId,
      schoolName: sub.school.name,
      schoolSlug: sub.school.slug,
      planId: sub.planId,
      planName: sub.plan.name,
      amount: sub.plan.price,
      currency: sub.plan.currency,
      period: sub.plan.period,
      status: sub.status,
      periodStart: sub.periodStart.toISOString(),
      periodEnd: sub.periodEnd?.toISOString() || null,
      autoRenew: sub.autoRenew,
      createdAt: sub.createdAt.toISOString(),
      updatedAt: sub.updatedAt.toISOString(),
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}

export async function POST(request: Request) {
  const auth = await requireAuth(request, ['admin', 'school']);
  if ('response' in auth) return auth.response;

  const body = await request.json();
  const { planId, schoolId, autoRenew, status, method, reference } = body;

  if (!planId) {
    return NextResponse.json({ error: 'planId is required' }, { status: 400 });
  }

  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: String(planId) } });
  if (!plan || !plan.isActive) {
    return NextResponse.json({ error: 'Plan not found or inactive' }, { status: 404 });
  }

  let targetSchoolId = schoolId ? String(schoolId) : null;
  if (auth.claims.role === 'school') {
    const school = await prisma.school.findFirst({
      where: { ownerUserId: auth.claims.sub },
      select: { id: true },
    });
    if (!school) return NextResponse.json({ error: 'School profile not found' }, { status: 404 });
    targetSchoolId = school.id;
  }

  if (!targetSchoolId) {
    return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
  }

  const periodStart = new Date();
  const periodEnd = toPeriodEnd(plan.period, periodStart);

  const subscription = await prisma.schoolSubscription.upsert({
    where: { schoolId: targetSchoolId },
    create: {
      schoolId: targetSchoolId,
      planId: plan.id,
      status: status || 'active',
      periodStart,
      periodEnd,
      autoRenew: autoRenew !== false,
    },
    update: {
      planId: plan.id,
      status: status || 'active',
      periodStart,
      periodEnd,
      autoRenew: autoRenew !== false,
    },
    include: {
      school: { select: { id: true, name: true, slug: true } },
      plan: true,
    },
  });

  await prisma.payment.create({
    data: {
      schoolId: targetSchoolId,
      subscriptionId: subscription.id,
      amount: plan.price,
      currency: plan.currency,
      status: status || 'paid',
      method: method || null,
      reference: reference || null,
      paidAt: new Date(),
    },
  });

  await prisma.school.update({
    where: { id: targetSchoolId },
    data: { isPremium: true },
  });

  await logAudit(auth.claims.sub, auth.claims.name, 'subscription.created', 'subscription', subscription.id, {
    schoolId: subscription.schoolId,
    planId: subscription.planId,
    planName: subscription.plan.name,
    amount: subscription.plan.price,
    currency: subscription.plan.currency,
    status: subscription.status,
  });

  return NextResponse.json({
    subscription: {
      id: subscription.id,
      schoolId: subscription.schoolId,
      schoolName: subscription.school.name,
      planId: subscription.planId,
      planName: subscription.plan.name,
      amount: subscription.plan.price,
      currency: subscription.plan.currency,
      period: subscription.plan.period,
      status: subscription.status,
      periodStart: subscription.periodStart.toISOString(),
      periodEnd: subscription.periodEnd?.toISOString() || null,
      autoRenew: subscription.autoRenew,
    },
  }, { status: 201 });
}
