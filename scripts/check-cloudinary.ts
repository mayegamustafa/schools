/**
 * Verifies the Cloudinary credentials in .env by performing a real signed
 * upload and then deleting it.
 *
 * Worth running before trusting a deploy: school registration requires a badge
 * and a cover photo, so if these credentials are wrong, nobody can register a
 * school at all — and the failure only surfaces at the last step of the form.
 *
 * Usage:  npx tsx scripts/check-cloudinary.ts
 */
import { readFileSync } from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';

/**
 * Minimal .env reader. Deliberately dependency-free so a diagnostic script never
 * fails for a reason unrelated to what it is diagnosing.
 */
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
    // No .env — fall back to whatever is already in the environment.
  }
}

loadEnv();

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

async function main() {
  console.log('Checking Cloudinary configuration…\n');

  if (!CLOUD_NAME) fail('CLOUDINARY_CLOUD_NAME is not set.');
  if (!API_KEY) fail('CLOUDINARY_API_KEY is not set.');
  if (!API_SECRET) {
    fail(
      'CLOUDINARY_API_SECRET is not set.\n'
      + '  Cloudinary Console → Settings → API Keys → reveal the secret, then put it in .env'
    );
  }

  console.log(`  cloud name : ${CLOUD_NAME}`);
  console.log(`  api key    : ${API_KEY}`);
  console.log(`  api secret : ${'*'.repeat(8)}${API_SECRET.slice(-4)}\n`);

  cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: API_KEY,
    api_secret: API_SECRET,
  });

  // 1x1 transparent PNG — smallest thing that exercises a real signed upload.
  const onePixelPng =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  let publicId: string | null = null;

  try {
    const result = await cloudinary.uploader.upload(onePixelPng, {
      folder: 'schools/_healthcheck',
      resource_type: 'image',
    });
    publicId = result.public_id;

    console.log('✓ Upload succeeded');
    console.log(`  ${result.secure_url}\n`);

    if (!result.secure_url.startsWith('https://res.cloudinary.com/')) {
      console.warn(
        '! Upload returned a non-standard host. The app only accepts media from\n'
        + '  res.cloudinary.com, so listings using this would be rejected.\n'
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/api_key|signature|401|Invalid/i.test(message)) {
      fail(
        `Cloudinary rejected the credentials: ${message}\n`
        + '  Check the API key and secret belong to the same product environment '
        + `("${CLOUD_NAME}").`
      );
    }
    fail(`Upload failed: ${message}`);
  }

  try {
    await cloudinary.uploader.destroy(publicId!);
    console.log('✓ Cleanup succeeded (delete permission confirmed)\n');
  } catch {
    console.warn(
      `! Uploaded fine but could not delete ${publicId}.\n`
      + '  Not fatal — the app never deletes — but remove it manually if you like.\n'
    );
  }

  console.log('Cloudinary is configured correctly. School media uploads will work.\n');
}

main().catch(error => fail(error instanceof Error ? error.message : String(error)));
