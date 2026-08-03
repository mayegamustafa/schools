import { NextResponse } from 'next/server';
import { hashSync } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { getClientIp, rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import {
  isSetupTokenConfigured,
  isValidSetupToken,
  resolveSetupMode,
} from '@/lib/admin-setup';

export const runtime = 'nodejs';

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const PASSWORD_MAX_LENGTH = 72;
const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Tells the page which of the three states it is in. Reveals no secrets. */
export async function GET(request: Request) {
  const limit = rateLimit(request, 'admin-setup-status', { limit: 20, windowMs: 10 * 60 * 1000 });
  if (!limit.ok) return rateLimitResponse(limit);

  try {
    const mode = await resolveSetupMode();
    return NextResponse.json(
      { mode, tokenConfigured: isSetupTokenConfigured() },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json({ error: 'Setup is unavailable right now' }, { status: 503 });
  }
}

/**
 * Creates the first admin, or resets an admin password with the setup token.
 *
 * Rate limited hard and audit logged on both success and failure — a page that
 * can hand out admin rights should leave a trail either way.
 */
export async function POST(request: Request) {
  const limit = rateLimit(request, 'admin-setup', { limit: 5, windowMs: 60 * 60 * 1000 });
  if (!limit.ok) return rateLimitResponse(limit);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const name = String(body.name || 'Administrator').trim().slice(0, 100) || 'Administrator';
  const setupToken = typeof body.setupToken === 'string' ? body.setupToken : null;

  if (!EMAIL_RULE.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return NextResponse.json(
      { error: `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer` },
      { status: 400 }
    );
  }
  if (!PASSWORD_RULE.test(password)) {
    return NextResponse.json(
      { error: 'Password must be 8+ characters with an uppercase letter, a lowercase letter, and a number' },
      { status: 400 }
    );
  }

  const mode = await resolveSetupMode();

  if (mode === 'disabled') {
    return NextResponse.json(
      {
        error:
          'An admin account already exists. Set ADMIN_SETUP_TOKEN in your environment to enable '
          + 'recovery here, or run `npm run admin:create` against the database.',
      },
      { status: 403 }
    );
  }

  if (mode === 'recovery' && !isValidSetupToken(setupToken)) {
    // Logged so repeated guessing against a live site is visible afterwards.
    await logAudit('anonymous', 'Admin setup', 'admin.setup_rejected', 'user', undefined, {
      email,
      ip: getClientIp(request),
      reason: 'invalid setup token',
    });

    return NextResponse.json({ error: 'Invalid setup token' }, { status: 403 });
  }

  // Bootstrap honours the token too when one is configured, so an un-set-up
  // deployment cannot simply be claimed by whoever reaches the URL first.
  if (mode === 'bootstrap' && isSetupTokenConfigured() && !isValidSetupToken(setupToken)) {
    return NextResponse.json({ error: 'Invalid setup token' }, { status: 403 });
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, role: true },
  });

  let outcome: 'created' | 'promoted' | 'reset';

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: 'admin', password: hashSync(password, 10) },
    });
    outcome = existing.role === 'admin' ? 'reset' : 'promoted';
  } else {
    await prisma.user.create({
      data: { name, email, password: hashSync(password, 10), role: 'admin' },
    });
    outcome = 'created';
  }

  await logAudit('anonymous', 'Admin setup', 'admin.setup_completed', 'user', existing?.id, {
    email,
    mode,
    outcome,
    ip: getClientIp(request),
  });

  return NextResponse.json({ success: true, outcome });
}
