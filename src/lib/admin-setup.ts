import { prisma } from '@/lib/prisma';

/**
 * Gating for the admin setup page.
 *
 * A page that can mint or reset an admin password is a site takeover waiting to
 * happen, so it is only ever reachable in two narrow situations:
 *
 *   bootstrap — no admin account exists yet. There is nothing to take over, and
 *               somebody has to create the first one.
 *   recovery  — an admin exists, so a shared secret (ADMIN_SETUP_TOKEN) is
 *               required. This is the locked-out path.
 *   disabled  — an admin exists and no token is configured. The page refuses and
 *               points at the CLI script instead.
 */
export type SetupMode = 'bootstrap' | 'recovery' | 'disabled';

/** A token shorter than this is treated as absent — a weak one is worse than none. */
const MIN_TOKEN_LENGTH = 24;

export function isSetupTokenConfigured(): boolean {
  const token = process.env.ADMIN_SETUP_TOKEN;
  return Boolean(token && token.length >= MIN_TOKEN_LENGTH);
}

/** Constant-time comparison, so the token cannot be recovered by timing. */
export function isValidSetupToken(provided: string | null | undefined): boolean {
  const expected = process.env.ADMIN_SETUP_TOKEN;
  if (!expected || expected.length < MIN_TOKEN_LENGTH) return false;
  if (!provided || provided.length !== expected.length) return false;

  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function resolveSetupMode(): Promise<SetupMode> {
  const adminCount = await prisma.user.count({ where: { role: 'admin' } });

  if (adminCount === 0) {
    // First-run. Still prefer the token when one is configured, so a deployment
    // that has not been set up yet cannot be claimed by whoever finds the URL.
    return 'bootstrap';
  }

  return isSetupTokenConfigured() ? 'recovery' : 'disabled';
}
