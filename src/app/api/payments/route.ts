import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

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

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        school: { select: { id: true, name: true, slug: true } },
        subscription: {
          include: { plan: true },
        },
      },
      orderBy: { paidAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.payment.count({ where }),
  ]);

  const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);

  return NextResponse.json({
    payments: payments.map(payment => ({
      id: payment.id,
      schoolId: payment.schoolId,
      schoolName: payment.school.name,
      schoolSlug: payment.school.slug,
      subscriptionId: payment.subscriptionId,
      planName: payment.subscription?.plan.name || null,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      method: payment.method,
      reference: payment.reference,
      paidAt: payment.paidAt.toISOString(),
      createdAt: payment.createdAt.toISOString(),
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
    summary: {
      totalAmount,
      recordsInPage: payments.length,
    },
  });
}

export async function POST(request: Request) {
  const auth = await requireAuth(request, ['admin', 'school']);
  if ('response' in auth) return auth.response;

  const body = await request.json();

  let targetSchoolId: string | null = body.schoolId ? String(body.schoolId) : null;
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

  const amount = Number(body.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
  }

  const payment = await prisma.payment.create({
    data: {
      schoolId: targetSchoolId,
      subscriptionId: body.subscriptionId ? String(body.subscriptionId) : null,
      amount,
      currency: String(body.currency || 'UGX'),
      status: String(body.status || 'paid'),
      method: body.method ? String(body.method) : null,
      reference: body.reference ? String(body.reference) : null,
      paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
    },
  });

  await logAudit(auth.claims.sub, auth.claims.name, 'payment.created', 'payment', payment.id, {
    schoolId: payment.schoolId,
    subscriptionId: payment.subscriptionId,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
  });

  return NextResponse.json({
    payment: {
      id: payment.id,
      schoolId: payment.schoolId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      method: payment.method,
      reference: payment.reference,
      paidAt: payment.paidAt.toISOString(),
    },
  }, { status: 201 });
}
