import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { createCheckout, isPaymentsConfigured } from '@/lib/flutterwave';
import { siteUrl } from '@/lib/site-url';

/**
 * Starts a subscription payment.
 *
 * This endpoint only creates a *pending* payment record and hands back a hosted
 * checkout URL. Activation happens exclusively in the webhook, after the
 * transaction has been verified with Flutterwave — a school owner calling this
 * a thousand times still cannot grant themselves a plan.
 */
export async function POST(request: Request) {
  const limit = rateLimit(request, 'checkout', { limit: 10, windowMs: 10 * 60 * 1000 });
  if (!limit.ok) return rateLimitResponse(limit);

  const auth = await requireAuth(request, ['school', 'admin']);
  if ('response' in auth) return auth.response;

  if (!isPaymentsConfigured()) {
    return NextResponse.json(
      { error: 'Online payment is not enabled yet. Please contact us to arrange payment.' },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const planId = String(body.planId || '').trim();
  if (!planId) {
    return NextResponse.json({ error: 'planId is required' }, { status: 400 });
  }

  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
  if (!plan || !plan.isActive) {
    return NextResponse.json({ error: 'Plan not found or inactive' }, { status: 404 });
  }

  if (plan.price <= 0) {
    return NextResponse.json({ error: 'This plan does not require payment' }, { status: 400 });
  }

  // A school account can only ever pay for its own listing.
  const school = auth.claims.role === 'admin' && body.schoolId
    ? await prisma.school.findUnique({
        where: { id: String(body.schoolId) },
        select: { id: true, name: true, email: true },
      })
    : await prisma.school.findFirst({
        where: { ownerUserId: auth.claims.sub },
        select: { id: true, name: true, email: true },
      });

  if (!school) {
    return NextResponse.json({ error: 'School profile not found' }, { status: 404 });
  }

  const txRef = `sf-${school.id.slice(0, 8)}-${randomUUID()}`;

  // Recorded as pending so an abandoned checkout leaves a trail rather than a
  // silent gap, and so the webhook has something to reconcile against.
  await prisma.payment.create({
    data: {
      schoolId: school.id,
      amount: plan.price,
      currency: plan.currency,
      status: 'pending',
      method: 'flutterwave',
      reference: txRef,
    },
  });

  try {
    const checkoutUrl = await createCheckout({
      txRef,
      amount: plan.price,
      currency: plan.currency,
      redirectUrl: `${siteUrl()}/dashboard/subscription?payment=complete`,
      customer: {
        email: school.email,
        name: school.name,
      },
      meta: {
        schoolId: school.id,
        planId: plan.id,
      },
      title: `${plan.name} plan`,
      description: `SchoolFinder ${plan.name} listing for ${school.name}`,
    });

    await logAudit(auth.claims.sub, auth.claims.name, 'payment.checkout_started', 'payment', txRef, {
      schoolId: school.id,
      planId: plan.id,
      amount: plan.price,
    });

    return NextResponse.json({ checkoutUrl });
  } catch (error) {
    await prisma.payment.updateMany({
      where: { reference: txRef },
      data: { status: 'failed' },
    });

    console.error('[payments] checkout failed:', error);
    return NextResponse.json({ error: 'Could not start the payment. Please try again.' }, { status: 502 });
  }
}
