import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

function parseFeatures(features: string): string[] {
  try {
    const parsed = JSON.parse(features);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const auth = await requireAuth(request, ['admin']);
  if ('response' in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const status = (searchParams.get('status') || 'all').trim();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (status === 'active') where.isActive = true;
  if (status === 'inactive') where.isActive = false;

  const plans = await prisma.subscriptionPlan.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
  });

  return NextResponse.json({
    plans: plans.map(plan => ({
      id: plan.id,
      name: plan.name,
      price: plan.price,
      currency: plan.currency,
      period: plan.period,
      features: parseFeatures(plan.features),
      isFeatured: plan.isFeatured,
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireAuth(request, ['admin']);
  if ('response' in auth) return auth.response;

  const body = await request.json();
  const name = String(body.name || '').trim();
  const period = String(body.period || '').trim();
  const currency = String(body.currency || 'UGX').trim();
  const price = Number(body.price);
  const sortOrder = body.sortOrder !== undefined ? Number(body.sortOrder) : 0;
  const features = Array.isArray(body.features) ? body.features : [];

  if (!name || !period) {
    return NextResponse.json({ error: 'name and period are required' }, { status: 400 });
  }

  if (!Number.isFinite(price) || price < 0) {
    return NextResponse.json({ error: 'price must be a valid number' }, { status: 400 });
  }

  const plan = await prisma.subscriptionPlan.create({
    data: {
      id: body.id ? String(body.id) : name.toLowerCase().replace(/\s+/g, '-'),
      name: name.slice(0, 100),
      price,
      currency: currency || 'UGX',
      period,
      features: JSON.stringify(features),
      isFeatured: Boolean(body.isFeatured),
      isActive: body.isActive !== false,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    },
  });

  await logAudit(auth.claims.sub, auth.claims.name, 'plan.created', 'plan', plan.id, {
    name: plan.name,
    price: plan.price,
    period: plan.period,
  });

  return NextResponse.json({
    plan: {
      id: plan.id,
      name: plan.name,
      price: plan.price,
      currency: plan.currency,
      period: plan.period,
      features: parseFeatures(plan.features),
      isFeatured: plan.isFeatured,
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
    },
  }, { status: 201 });
}
