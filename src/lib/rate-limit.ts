import { NextResponse } from 'next/server';

/**
 * In-process fixed-window rate limiter.
 *
 * Deliberately simple: it needs no extra infrastructure and stops the obvious
 * abuse the site had no defence against at all — credential stuffing on login,
 * signup floods, and lead/review spam aimed at paying schools.
 *
 * Limitation worth knowing: the counters live in the process, so each instance
 * enforces its own budget. On a single Railway container that is the whole app;
 * once you scale horizontally, move this to Redis (or Railway's KV) and keep the
 * same call signature.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Stops the map growing without bound on a long-running process. */
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(
  request: Request,
  scope: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const key = `${scope}:${getClientIp(request)}`;
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;

  if (existing.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  return { ok: true, remaining: limit - existing.count, retryAfterSeconds: 0 };
}

export function rateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    { error: 'Too many requests. Please wait a moment and try again.' },
    {
      status: 429,
      headers: { 'Retry-After': String(result.retryAfterSeconds) },
    }
  );
}
