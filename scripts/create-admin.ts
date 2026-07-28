/**
 * Creates an admin account, or promotes an existing user to admin.
 *
 * Deliberately separate from the seed: `prisma db seed` deletes every row in
 * every table before inserting, so it must never be used to recover admin
 * access on a database with real schools and accounts in it.
 *
 * This script only ever touches the one user it is given.
 *
 * Usage (local):
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='StrongPass1' npx tsx scripts/create-admin.ts
 *
 * Usage (against Railway):
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='StrongPass1' \
 *     railway run npx tsx scripts/create-admin.ts
 */
import { readFileSync } from 'fs';
import path from 'path';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashSync } from 'bcryptjs';

/** Dependency-free .env reader; DATABASE_URL from the real environment wins. */
function loadEnv() {
  try {
    const raw = readFileSync(path.join(process.cwd(), '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key]) continue;
      process.env[key] = rawValue.trim().replace(/^["']|["']$/g, '');
    }
  } catch {
    // No .env file — use the ambient environment.
  }
}

loadEnv();

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

async function main() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  const name = (process.env.ADMIN_NAME || 'Administrator').trim();

  if (!EMAIL_RULE.test(email)) {
    fail('Set ADMIN_EMAIL to a valid email address.');
  }
  if (!PASSWORD_RULE.test(password)) {
    fail('ADMIN_PASSWORD must be 8+ characters with an uppercase letter, a lowercase letter, and a number.');
  }
  if (password.length > 72) {
    fail('ADMIN_PASSWORD must be 72 characters or fewer (bcrypt ignores anything beyond that).');
  }

  const url = process.env.DATABASE_URL;
  if (!url) fail('DATABASE_URL is not set.');

  let host = 'unknown';
  try {
    host = new URL(url).host;
  } catch {
    // Keep going; Prisma will report a bad URL more clearly than we can.
  }

  console.log(`\nDatabase : ${host}`);
  console.log(`Account  : ${email}\n`);

  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter });

  try {
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, role: true },
    });

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: 'admin', password: hashSync(password, 10) },
      });
      console.log(
        existing.role === 'admin'
          ? '✓ Existing admin account — password reset.'
          : `✓ Promoted "${existing.name}" from ${existing.role} to admin, and reset the password.`
      );
    } else {
      await prisma.user.create({
        data: { name, email, password: hashSync(password, 10), role: 'admin' },
      });
      console.log('✓ Admin account created.');
    }

    const [admins, pending] = await Promise.all([
      prisma.user.count({ where: { role: 'admin' } }),
      prisma.school.count({ where: { status: 'pending' } }),
    ]);

    console.log(`\n  admin accounts    : ${admins}`);
    console.log(`  schools awaiting review : ${pending}`);
    console.log('\nSign in at /auth/login, then review listings at /admin/schools\n');
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  } finally {
    await prisma.$disconnect();
  }
}

main();
