import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiOptions, UploadApiResponse } from 'cloudinary';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const runtime = 'nodejs';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;  // 5 MB
const MAX_VIDEO_SIZE = 30 * 1024 * 1024; // 30 MB
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

function uploadToCloudinary(buffer: Buffer, options: UploadApiOptions): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error || !result) return reject(error ?? new Error('Upload failed'));
      resolve(result);
    });
    stream.end(buffer);
  });
}

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
