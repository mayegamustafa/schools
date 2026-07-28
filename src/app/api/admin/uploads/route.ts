import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  uploadToCloudinary,
} from '@/lib/cloudinary';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const auth = await requireAuth(request, ['admin']);
  if ('response' in auth) return auth.response;

  const formData = await request.formData();
  const file = formData.get('file');
  const kind = String(formData.get('kind') || 'image').trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }

  const isVideo = kind === 'video' || ALLOWED_VIDEO_TYPES.has(file.type);
  const allowedTypes = isVideo ? ALLOWED_VIDEO_TYPES : ALLOWED_IMAGE_TYPES;
  const sizeLimit = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

  if (!allowedTypes.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported ${isVideo ? 'video' : 'image'} format. Allowed: ${[...allowedTypes].join(', ')}` },
      { status: 400 },
    );
  }

  if (file.size > sizeLimit) {
    return NextResponse.json(
      { error: `File exceeds size limit (${isVideo ? '30' : '5'} MB)` },
      { status: 400 },
    );
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const result = await uploadToCloudinary(buffer, {
    folder: 'site',
    resource_type: isVideo ? 'video' : 'image',
  });

  return NextResponse.json({ url: result.secure_url, kind: isVideo ? 'video' : 'image' });
}
