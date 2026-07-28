import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Raises a password-reset request for an admin to verify and action.
 *
 * Deliberately returns the same success response whether or not the account
 * exists — otherwise this becomes an endpoint for enumerating which emails are
 * registered. A ticket is only created for real accounts.
 */
export async function POST(request: Request) {
  const limit = rateLimit(request, 'forgot-password', { limit: 5, windowMs: 60 * 60 * 1000 });
  if (!limit.ok) return rateLimitResponse(limit);

  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const name = String(body.name || '').trim().slice(0, 100);
    const schoolName = String(body.schoolName || '').trim().slice(0, 200);

    if (!EMAIL_RULE.test(email) || name.length < 2) {
      return NextResponse.json({ error: 'A valid email and your name are required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true },
    });

    if (user) {
      await prisma.supportTicket.create({
        data: {
          submitterName: name,
          submitterEmail: email,
          subject: 'Password reset request',
          message: [
            `${name} requested a password reset for ${email}.`,
            schoolName ? `School named on the request: ${schoolName}.` : null,
            'Verify the requester owns this account before setting a new password.',
          ].filter(Boolean).join('\n'),
          status: 'open',
          priority: 'high',
        },
      });

      await logAudit(user.id, user.name, 'auth.password_reset_requested', 'user', user.id, {
        email,
        schoolName: schoolName || null,
      });
    }

    // Identical response either way — see note above.
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
  }
}
