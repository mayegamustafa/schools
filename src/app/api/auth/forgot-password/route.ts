import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { isEmailConfigured, sendEmail, emailLayout } from '@/lib/email';
import { issueToken } from '@/lib/tokens';
import { siteUrl } from '@/lib/site-url';

const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Starts password recovery.
 *
 * With SMTP configured this emails a single-use, one-hour reset link. Without
 * it, the request falls back to a high-priority support ticket an admin can
 * action manually — the site should never be left with no recovery path at all.
 *
 * The response is identical whether or not the account exists; otherwise this
 * becomes an endpoint for discovering which emails are registered.
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
      if (isEmailConfigured()) {
        const { raw } = await issueToken({
          purpose: 'password_reset',
          email,
          userId: user.id,
        });

        const resetUrl = `${siteUrl()}/auth/reset-password?token=${encodeURIComponent(raw)}`;

        await sendEmail({
          to: email,
          subject: 'Reset your SchoolFinder password',
          text:
            `Hi ${user.name},\n\n`
            + `Use this link to set a new password. It expires in one hour and can only be used once:\n\n`
            + `${resetUrl}\n\n`
            + `If you did not request this, you can ignore this email — your password will not change.`,
          html: emailLayout(
            'Reset your password',
            `<p>Hi ${user.name},</p>
             <p>Use the button below to set a new password. The link expires in one hour and can only be used once.</p>
             <p>If you did not request this, you can ignore this email — your password will not change.</p>`,
            { label: 'Set a new password', url: resetUrl }
          ),
        });

        await logAudit(user.id, user.name, 'auth.password_reset_requested', 'user', user.id, {
          email,
          delivery: 'email',
        });
      } else {
        await prisma.supportTicket.create({
          data: {
            submitterName: name,
            submitterEmail: email,
            subject: 'Password reset request',
            message: [
              `${name} requested a password reset for ${email}.`,
              schoolName ? `School named on the request: ${schoolName}.` : null,
              'Verify the requester owns this account before setting a new password.',
              'NOTE: SMTP is not configured, so no reset email was sent.',
            ].filter(Boolean).join('\n'),
            status: 'open',
            priority: 'high',
          },
        });

        await logAudit(user.id, user.name, 'auth.password_reset_requested', 'user', user.id, {
          email,
          delivery: 'support-ticket',
        });
      }
    }

    // Identical response either way — see note above.
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
  }
}
