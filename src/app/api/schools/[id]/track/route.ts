import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClientIp, rateLimit, rateLimitResponse } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const VALID_KINDS = new Set(['profile', 'contact']);

/**
 * Derives a per-visitor identifier without storing anything identifying.
 *
 * IP + user agent are hashed together with the auth secret and the current date,
 * so the value is stable for one day and cannot be reversed into an IP. Rotating
 * daily also means the hash can't be used to follow someone over time.
 */
function sessionHash(request: Request, day: string): string {
  const ip = getClientIp(request);
  const agent = request.headers.get('user-agent') || '';
  const salt = process.env.AUTH_SECRET || 'schoolfinder-analytics';

  return createHash('sha256').update(`${ip}|${agent}|${day}|${salt}`).digest('hex').slice(0, 32);
}

/** Buckets a referrer into the categories the dashboard reports. */
function classifySource(referrer: string | null, host: string): string {
  if (!referrer) return 'direct';

  try {
    const refHost = new URL(referrer).hostname.toLowerCase();
    if (refHost === host || refHost.endsWith(`.${host}`)) return 'direct';
    if (/(google|bing|duckduckgo|yahoo|ecosia)\./.test(refHost)) return 'search';
    if (/(facebook|instagram|twitter|x\.com|linkedin|tiktok|whatsapp|t\.co)/.test(refHost)) return 'social';
    return 'referral';
  } catch {
    return 'direct';
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Generous, since this fires on legitimate page views, but capped so the table
  // can't be inflated to fake engagement for a listing.
  const limit = rateLimit(request, 'track', { limit: 60, windowMs: 60 * 1000 });
  if (!limit.ok) return rateLimitResponse(limit);

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const kind = VALID_KINDS.has(body?.kind) ? String(body.kind) : 'profile';

  const school = await prisma.school.findFirst({
    where: { OR: [{ id }, { slug: id }], status: 'active' },
    select: { id: true },
  });

  // Silently ignore unknown or unpublished schools — this is a fire-and-forget
  // beacon and the client has nothing useful to do with an error.
  if (!school) return NextResponse.json({ ok: true });

  const day = new Date().toISOString().slice(0, 10);
  const referrer = typeof body?.referrer === 'string' ? body.referrer.slice(0, 500) : null;
  const host = new URL(request.url).hostname;

  try {
    await prisma.schoolView.create({
      data: {
        schoolId: school.id,
        kind,
        source: classifySource(referrer, host),
        referrer,
        sessionHash: sessionHash(request, day),
        day,
      },
    });
  } catch {
    // Unique violation = same visitor, same school, same day. That is the
    // deduplication working, not an error.
  }

  return NextResponse.json({ ok: true });
}
