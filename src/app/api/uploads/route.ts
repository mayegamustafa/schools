import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 30 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

function getExtension(file: File): string {
  const nameExt = file.name.includes('.') ? file.name.split('.').pop() : '';
  if (nameExt) return `.${String(nameExt).toLowerCase()}`;
  if (file.type === 'image/png') return '.png';
  if (file.type === 'image/webp') return '.webp';
  if (file.type === 'video/webm') return '.webm';
  if (file.type === 'video/quicktime') return '.mov';
  return '.jpg';
}

export async function POST(request: Request) {
  const auth = await requireAuth(request, ['admin', 'school']);
  if ('response' in auth) return auth.response;

  const formData = await request.formData();
  const schoolId = String(formData.get('schoolId') || '').trim();
  const file = formData.get('file');
  const kind = String(formData.get('kind') || 'gallery').trim();

  if (!schoolId || !(file instanceof File)) {
    return NextResponse.json({ error: 'schoolId and file are required' }, { status: 400 });
  }

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { id: true, ownerUserId: true, name: true },
  });

  if (!school) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 });
  }

  if (auth.claims.role === 'school' && school.ownerUserId !== auth.claims.sub) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const isVideo = kind === 'video';
  const allowedTypes = isVideo ? ALLOWED_VIDEO_TYPES : ALLOWED_IMAGE_TYPES;
  const sizeLimit = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

  if (!allowedTypes.has(file.type)) {
    return NextResponse.json({ error: `Unsupported ${isVideo ? 'video' : 'image'} format` }, { status: 400 });
  }

  if (file.size > sizeLimit) {
    return NextResponse.json({ error: `${isVideo ? 'Video' : 'Image'} exceeds size limit` }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const baseDir = path.join(process.cwd(), 'public', 'uploads', 'schools', school.id, isVideo ? 'videos' : 'images');
  await mkdir(baseDir, { recursive: true });

  const filename = `${Date.now()}-${randomUUID()}${getExtension(file)}`;
  const destination = path.join(baseDir, filename);
  await writeFile(destination, buffer);

  const urlPath = `/uploads/schools/${school.id}/${isVideo ? 'videos' : 'images'}/${filename}`;

  await logAudit(auth.claims.sub, auth.claims.name, 'media.uploaded', 'school', school.id, {
    kind,
    path: urlPath,
    contentType: file.type,
    size: file.size,
  });

  return NextResponse.json({ url: urlPath, kind, schoolId: school.id });
}