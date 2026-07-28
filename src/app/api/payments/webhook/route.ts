import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { isValidWebhookSignature, verifyTransaction } from '@/lib/flutterwave';

export const runtime = 'nodejs';

function periodEndFrom(period: string, start: Date): Date {
  const end = new Date(start);
  if (period === 'yearly') end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return end;
}

/**
 * Flutterwave payment webhook — the only path that can activate a paid plan.
 *
 * Three checks before anything is granted:
 *   1. The `verif-hash` signature matches our shared secret.
 *   2. The transaction is re-read from Flutterwave's API, not trusted from the
 *      request body, which an attacker could forge or replay.
 *   3. The verified amount and currency match the plan being claimed, so a
 *      cheap transaction cannot be pointed at an expensive plan.
 */
export async function POST(request: Request) {
  if (!isValidWebhookSignature(request.headers.get('verif-hash'))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const transactionId = body?.data?.id;

  if (!transactionId) {
    return NextResponse.json({ error: 'Missing transaction id' }, { status: 400 });
  }

  const verified = await verifyTransaction(String(transactionId));
  if (!verified || verified.status.toLowerCase() !== 'successful') {
    await prisma.payment.updateMany({
      where: { reference: String(body?.data?.tx_ref || ''), status: 'pending' },
      data: { status: 'failed' },
    });
    return NextResponse.json({ received: true, activated: false });
  }

  const schoolId = String(verified.meta.schoolId || '');
  const planId = String(verified.meta.planId || '');

  if (!schoolId || !planId) {
    return NextResponse.json({ error: 'Transaction is missing school or plan metadata' }, { status: 400 });
  }

  const [school, plan] = await Promise.all([
    prisma.school.findUnique({ where: { id: schoolId }, select: { id: true, name: true } }),
    prisma.subscriptionPlan.findUnique({ where: { id: planId } }),
  ]);

  if (!school || !plan) {
    return NextResponse.json({ error: 'Unknown school or plan' }, { status: 404 });
  }

  // Guards against a replayed cheap transaction being applied to a costly plan.
  if (verified.amount < plan.price || verified.currency !== plan.currency) {
    await logAudit('system', 'Flutterwave webhook', 'payment.amount_mismatch', 'payment', verified.txRef, {
      schoolId,
      planId,
      expected: `${plan.price} ${plan.currency}`,
      received: `${verified.amount} ${verified.currency}`,
    });
    return NextResponse.json({ error: 'Amount does not match the plan' }, { status: 400 });
  }

  // Idempotency: Flutterwave retries webhooks, and the same transaction must not
  // extend a subscription twice.
  const alreadyPaid = await prisma.payment.findFirst({
    where: { reference: verified.txRef, status: 'paid' },
    select: { id: true },
  });
  if (alreadyPaid) {
    return NextResponse.json({ received: true, activated: true, duplicate: true });
  }

  const periodStart = new Date();
  const periodEnd = periodEndFrom(plan.period, periodStart);

  await prisma.$transaction(async tx => {
    const subscription = await tx.schoolSubscription.upsert({
      where: { schoolId: school.id },
      create: {
        schoolId: school.id,
        planId: plan.id,
        status: 'active',
        periodStart,
        periodEnd,
        autoRenew: true,
      },
      update: {
        planId: plan.id,
        status: 'active',
        periodStart,
        periodEnd,
      },
    });

    const existing = await tx.payment.findFirst({
      where: { reference: verified.txRef },
      select: { id: true },
    });

    if (existing) {
      await tx.payment.update({
        where: { id: existing.id },
        data: {
          status: 'paid',
          subscriptionId: subscription.id,
          method: verified.paymentType || 'flutterwave',
          paidAt: new Date(),
        },
      });
    } else {
      await tx.payment.create({
        data: {
          schoolId: school.id,
          subscriptionId: subscription.id,
          amount: verified.amount,
          currency: verified.currency,
          status: 'paid',
          method: verified.paymentType || 'flutterwave',
          reference: verified.txRef,
          paidAt: new Date(),
        },
      });
    }

    await tx.school.update({
      where: { id: school.id },
      data: { isPremium: true },
    });
  });

  await logAudit('system', 'Flutterwave webhook', 'subscription.activated', 'subscription', school.id, {
    planId: plan.id,
    amount: verified.amount,
    currency: verified.currency,
    reference: verified.txRef,
  });

  return NextResponse.json({ received: true, activated: true });
}
