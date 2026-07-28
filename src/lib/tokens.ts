import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/prisma';

export type TokenPurpose = 'password_reset' | 'email_verify';

const TTL_MINUTES: Record<TokenPurpose, number> = {
  password_reset: 60,
  email_verify: 60 * 24 * 7,
};

/** Tokens are stored hashed; the raw value exists only in the email we send. */
export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export interface IssuedToken {
  raw: string;
  expiresAt: Date;
}

export async function issueToken(options: {
  purpose: TokenPurpose;
  email: string;
  userId?: string;
  schoolId?: string;
}): Promise<IssuedToken> {
  const raw = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + TTL_MINUTES[options.purpose] * 60 * 1000);

  // Invalidate any outstanding tokens of the same purpose, so requesting a new
  // link immediately retires the previous one.
  if (options.userId) {
    await prisma.verificationToken.updateMany({
      where: { userId: options.userId, purpose: options.purpose, usedAt: null },
      data: { usedAt: new Date() },
    });
  }

  await prisma.verificationToken.create({
    data: {
      purpose: options.purpose,
      tokenHash: hashToken(raw),
      email: options.email,
      userId: options.userId ?? null,
      schoolId: options.schoolId ?? null,
      expiresAt,
    },
  });

  return { raw, expiresAt };
}

export interface ConsumedToken {
  id: string;
  email: string;
  userId: string | null;
  schoolId: string | null;
}

/**
 * Validates and burns a token in one step.
 *
 * The update is conditional on `usedAt: null`, so two concurrent requests with
 * the same token cannot both succeed — the second matches zero rows.
 */
export async function consumeToken(
  raw: string,
  purpose: TokenPurpose
): Promise<ConsumedToken | null> {
  if (!raw || raw.length < 16) return null;

  const record = await prisma.verificationToken.findUnique({
    where: { tokenHash: hashToken(raw) },
  });

  if (!record || record.purpose !== purpose) return null;
  if (record.usedAt) return null;
  if (record.expiresAt.getTime() < Date.now()) return null;

  const burned = await prisma.verificationToken.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  if (burned.count === 0) return null;

  return {
    id: record.id,
    email: record.email,
    userId: record.userId,
    schoolId: record.schoolId,
  };
}

/** Constant-time compare, for callers matching a token outside the database. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
