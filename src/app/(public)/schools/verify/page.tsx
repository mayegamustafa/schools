import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { consumeToken } from '@/lib/tokens';
import { logAudit } from '@/lib/audit';

export const metadata: Metadata = {
  title: 'Verify your school',
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

/**
 * Landing page for the school ownership-verification link.
 *
 * The token is consumed during the server render rather than via a client
 * round-trip, so opening the link is all it takes — no JavaScript required, and
 * nothing to retry if the browser is slow.
 */
export default async function VerifySchoolPage({ searchParams }: PageProps) {
  const { token } = await searchParams;

  let school: { name: string; slug: string } | null = null;
  let failed = !token;

  if (token) {
    const consumed = await consumeToken(token, 'email_verify');

    if (consumed?.schoolId) {
      const updated = await prisma.school.update({
        where: { id: consumed.schoolId },
        data: { emailVerified: true },
        select: { id: true, name: true, slug: true },
      });

      await logAudit('system', 'Email verification', 'school.email_verified', 'school', updated.id, {
        email: consumed.email,
      });

      school = { name: updated.name, slug: updated.slug };
    } else {
      failed = true;
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        {school ? (
          <>
            <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-text-primary mb-3">{school.name} is verified</h1>
            <p className="text-text-secondary mb-6">
              Thanks for confirming this address. Your listing now shows a verified contact.
            </p>
            <Link
              href={`/schools/${school.slug}`}
              className="inline-block px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors"
            >
              View your listing
            </Link>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-text-primary mb-3">
              {failed && token ? 'This link has expired' : 'Verification link missing'}
            </h1>
            <p className="text-text-secondary mb-6">
              Verification links last 7 days and can only be used once. Sign in to your dashboard to
              send a fresh one.
            </p>
            <Link
              href="/dashboard/profile"
              className="inline-block px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors"
            >
              Go to dashboard
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
