import { NextResponse } from 'next/server';
import { hashSync } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { consumeToken } from '@/lib/tokens';

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const PASSWORD_MAX_LENGTH = 72;

/**
 * Completes a password reset.
 *
 * The token is validated and burned atomically, so a link cannot be replayed —
 * including by two concurrent requests racing with the same token.
 */
export async function POST(request: Request) {
  const limit = rateLimit(request, 'reset-password', { limit: 10, windowMs: 60 * 60 * 1000 });
  if (!limit.ok) return rateLimitResponse(limit);

  try {
    const body = await request.json();
    const token = String(body.token || '');
    const password = String(body.password || '');

    if (!token) {
      return NextResponse.json({ error: 'Reset token is required' }, { status: 400 });
    }

    if (password.length > PASSWORD_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer` },
        { status: 400 }
      );
    }

    if (!PASSWORD_RULE.test(password)) {
      return NextResponse.json(
        { error: 'Password must be 8+ characters with uppercase, lowercase, and a number' },
        { status: 400 }
      );
    }

    const consumed = await consumeToken(token, 'password_reset');
    if (!consumed || !consumed.userId) {
      return NextResponse.json(
        { error: 'This reset link is invalid or has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id: consumed.userId },
      data: { password: hashSync(password, 10) },
      select: { id: true, name: true, email: true },
    });

    await logAudit(user.id, user.name, 'auth.password_reset_completed', 'user', user.id, {
      email: user.email,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
  }
}
