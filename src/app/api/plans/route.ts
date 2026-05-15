import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function parseFeatures(features: string): string[] {
  try {
    const parsed = JSON.parse(features);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period');

  const plans = await prisma.subscriptionPlan.findMany({
    where: {
      isActive: true,
      ...(period ? { period } : {}),
    },
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
    })),
  });
}
