/**
 * Flutterwave integration.
 *
 * Chosen because it covers the payment methods Ugandan schools actually use —
 * MTN Mobile Money, Airtel Money, and cards — behind one API.
 *
 * The rule that matters: a subscription only ever becomes active from a webhook
 * whose signature we verified, or from an explicit server-side verification call
 * against Flutterwave's API. A client request must never be able to activate a
 * plan, which is exactly the hole this replaces.
 */

const API_BASE = 'https://api.flutterwave.com/v3';

export function isPaymentsConfigured(): boolean {
  return Boolean(process.env.FLUTTERWAVE_SECRET_KEY && process.env.FLUTTERWAVE_WEBHOOK_HASH);
}

export interface CheckoutRequest {
  txRef: string;
  amount: number;
  currency: string;
  redirectUrl: string;
  customer: { email: string; name: string; phonenumber?: string };
  meta: Record<string, string>;
  title: string;
  description: string;
}

/** Creates a hosted payment page and returns the URL to send the school to. */
export async function createCheckout(request: CheckoutRequest): Promise<string> {
  const res = await fetch(`${API_BASE}/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tx_ref: request.txRef,
      amount: request.amount,
      currency: request.currency,
      redirect_url: request.redirectUrl,
      customer: request.customer,
      meta: request.meta,
      // Mobile money first: most Ugandan schools pay by MoMo, not card.
      payment_options: 'mobilemoneyuganda,card,banktransfer',
      customizations: {
        title: request.title,
        description: request.description,
      },
    }),
  });

  const payload = await res.json();
  if (!res.ok || payload.status !== 'success' || !payload.data?.link) {
    throw new Error(payload.message || 'Could not start the payment');
  }

  return payload.data.link as string;
}

export interface VerifiedTransaction {
  status: string;
  amount: number;
  currency: string;
  txRef: string;
  flwRef: string | null;
  paymentType: string | null;
  meta: Record<string, unknown>;
}

/**
 * Confirms a transaction directly with Flutterwave.
 *
 * Never trust the amount or status reported by a redirect or webhook body alone
 * — an attacker can replay a webhook for a 1,000 UGX payment against a
 * 500,000 UGX plan. Always re-read the authoritative record and compare.
 */
export async function verifyTransaction(transactionId: string): Promise<VerifiedTransaction | null> {
  const res = await fetch(`${API_BASE}/transactions/${transactionId}/verify`, {
    headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` },
  });

  const payload = await res.json();
  if (!res.ok || payload.status !== 'success' || !payload.data) return null;

  return {
    status: String(payload.data.status || ''),
    amount: Number(payload.data.amount || 0),
    currency: String(payload.data.currency || ''),
    txRef: String(payload.data.tx_ref || ''),
    flwRef: payload.data.flw_ref ? String(payload.data.flw_ref) : null,
    paymentType: payload.data.payment_type ? String(payload.data.payment_type) : null,
    meta: (payload.data.meta || {}) as Record<string, unknown>,
  };
}

/**
 * Flutterwave signs webhooks with a shared secret in the `verif-hash` header.
 * Compared in constant time so the comparison cannot be timed to leak the hash.
 */
export function isValidWebhookSignature(header: string | null): boolean {
  const expected = process.env.FLUTTERWAVE_WEBHOOK_HASH;
  if (!expected || !header) return false;
  if (header.length !== expected.length) return false;

  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= header.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}
