import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { isEmailConfigured, sendEmail, emailLayout } from '@/lib/email';
import { issueToken } from '@/lib/tokens';
import { siteUrl } from '@/lib/site-url';

/**
 * Sends an ownership-verification link to the school's own contact address.
 *
 * This is the only automated check that the person registering a listing is
 * connected to the school. Anyone could previously claim any school and start
 * receiving its admission enquiries; a confirmed contact address at least proves
 * control of the published email.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const limit = rateLimit(request, 'verify-school-email', { limit: 5, windowMs: 60 * 60 * 1000 });
  if (!limit.ok) return rateLimitResponse(limit);

  const auth = await requireAuth(request, ['school', 'admin']);
  if ('response' in auth) return auth.response;

  const { id } = await params;
  const school = await prisma.school.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    select: { id: true, name: true, email: true, ownerUserId: true, emailVerified: true },
  });

  if (!school) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 });
  }

  if (auth.claims.role !== 'admin' && school.ownerUserId !== auth.claims.sub) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (school.emailVerified) {
    return NextResponse.json({ success: true, alreadyVerified: true });
  }

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: 'Email verification is not available yet. Please contact support.' },
      { status: 503 }
    );
  }

  const { raw } = await issueToken({
    purpose: 'email_verify',
    email: school.email,
    userId: auth.claims.sub,
    schoolId: school.id,
  });

  const verifyUrl = `${siteUrl()}/schools/verify?token=${encodeURIComponent(raw)}`;

  const result = await sendEmail({
    to: school.email,
    subject: `Verify ${school.name} on SchoolFinder`,
    text:
      `A SchoolFinder listing has been created for ${school.name}, using this address as the school's contact.\n\n`
      + `Confirm it by opening this link (valid for 7 days):\n\n${verifyUrl}\n\n`
      + `If you did not expect this, please ignore this email and contact us — someone may be attempting to claim your school.`,
    html: emailLayout(
      `Verify ${school.name}`,
      `<p>A SchoolFinder listing has been created for <strong>${school.name}</strong>, using this address as the school's contact.</p>
       <p>Confirm it with the button below. The link is valid for 7 days.</p>
       <p>If you did not expect this, please ignore this email and contact us — someone may be attempting to claim your school.</p>`,
      { label: 'Verify this school', url: verifyUrl }
    ),
  });

  if (!result.sent) {
    return NextResponse.json({ error: 'Could not send the verification email. Try again shortly.' }, { status: 502 });
  }

  await logAudit(auth.claims.sub, auth.claims.name, 'school.verification_sent', 'school', school.id, {
    email: school.email,
  });

  return NextResponse.json({ success: true });
}
