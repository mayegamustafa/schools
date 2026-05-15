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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id } });
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

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
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request, ['admin']);
  if ('response' in auth) return auth.response;

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.subscriptionPlan.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

  const plan = await prisma.subscriptionPlan.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: String(body.name).slice(0, 100) }),
      ...(body.price !== undefined && { price: Number(body.price) }),
      ...(body.currency !== undefined && { currency: String(body.currency) }),
      ...(body.period !== undefined && { period: String(body.period) }),
      ...(body.features !== undefined && { features: JSON.stringify(Array.isArray(body.features) ? body.features : []) }),
      ...(body.isFeatured !== undefined && { isFeatured: Boolean(body.isFeatured) }),
      ...(body.isActive !== undefined && { isActive: Boolean(body.isActive) }),
      ...(body.sortOrder !== undefined && { sortOrder: Number(body.sortOrder) }),
    },
  });

  await logAudit(auth.claims.sub, auth.claims.name, 'plan.updated', 'plan', plan.id, {
    updatedFields: Object.keys(body || {}),
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
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request, ['admin']);
  if ('response' in auth) return auth.response;

  const { id } = await params;

  const existing = await prisma.subscriptionPlan.findUnique({
    where: { id },
    include: { subscriptions: true },
  });
  if (!existing) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

  if (existing.subscriptions.length > 0) {
    return NextResponse.json(
      { error: 'Cannot delete a plan with active subscriptions. Deactivate it instead.' },
      { status: 409 }
    );
  }

  await prisma.subscriptionPlan.delete({ where: { id } });

  await logAudit(auth.claims.sub, auth.claims.name, 'plan.deleted', 'plan', id, {
    name: existing.name,
  });
  return NextResponse.json({ success: true });
}
