import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  isCloudinaryConfigured,
  transformsFor,
  uploadToCloudinary,
} from '@/lib/cloudinary';

export const runtime = 'nodejs';

const VALID_KINDS = new Set(['logo', 'cover', 'gallery', 'video']);

/**
 * School media upload.
 *
 * Previously wrote to public/uploads on the local filesystem, which is ephemeral
 * on Railway/Vercel — every redeploy silently deleted every school's photos, and
 * a second instance couldn't see the first's files. Everything now goes to
 * Cloudinary, matching what the admin upload route already did.
 *
 * `schoolId` is optional: during registration the school row doesn't exist yet,
 * so uploads are filed under the owner's pending folder and attached to the
 * school when it is created.
 */
export async function POST(request: Request) {
  const limit = rateLimit(request, 'upload', { limit: 30, windowMs: 10 * 60 * 1000 });
  if (!limit.ok) return rateLimitResponse(limit);

  const auth = await requireAuth(request, ['admin', 'school', 'user']);
  if ('response' in auth) return auth.response;

  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { error: 'Image uploads are not configured. Set the CLOUDINARY_* environment variables.' },
      { status: 503 }
    );
  }

  const formData = await request.formData();
  const schoolId = String(formData.get('schoolId') || '').trim();
  const file = formData.get('file');
  const kind = String(formData.get('kind') || 'gallery').trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'A file is required' }, { status: 400 });
  }

  if (!VALID_KINDS.has(kind)) {
    return NextResponse.json({ error: 'Invalid upload kind' }, { status: 400 });
  }

  let folder: string;

  if (schoolId) {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, ownerUserId: true },
    });

    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    if (auth.claims.role !== 'admin' && school.ownerUserId !== auth.claims.sub) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    folder = `schools/${school.id}`;
  } else {
    // Pre-registration upload — scoped to the uploader so one account cannot
    // overwrite or enumerate another's pending media.
    folder = `schools/pending/${auth.claims.sub}`;
  }

  const isVideo = kind === 'video';
  const allowedTypes = isVideo ? ALLOWED_VIDEO_TYPES : ALLOWED_IMAGE_TYPES;
  const sizeLimit = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

  if (!allowedTypes.has(file.type)) {
    return NextResponse.json(
      {
        error: isVideo
          ? 'Unsupported video format. Use MP4, WebM, or MOV.'
          : 'Unsupported image format. Use JPG, PNG, or WebP.',
      },
      { status: 400 }
    );
  }

  if (file.size > sizeLimit) {
    return NextResponse.json(
      { error: `${isVideo ? 'Video' : 'Image'} exceeds the ${isVideo ? '30' : '5'} MB limit` },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let result;
  try {
    result = await uploadToCloudinary(buffer, {
      folder,
      resource_type: isVideo ? 'video' : 'image',
      ...transformsFor(kind),
    });
  } catch {
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 502 });
  }

  await logAudit(auth.claims.sub, auth.claims.name, 'media.uploaded', 'school', schoolId || undefined, {
    kind,
    folder,
    contentType: file.type,
    size: file.size,
  });

  return NextResponse.json({
    url: result.secure_url,
    kind,
    schoolId: schoolId || null,
  });
}
