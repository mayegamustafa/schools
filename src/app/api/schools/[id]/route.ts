import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serializeSchool } from '@/lib/serialize';
import { requireAuth } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const school = await prisma.school.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
    },
  });

  if (!school) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 });
  }

  return NextResponse.json({ school: serializeSchool(school) });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request, ['admin', 'school']);
  if ('response' in auth) return auth.response;

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.school.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
    },
  });
  if (!existing) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 });
  }

  if (auth.claims.role === 'school' && existing.ownerUserId !== auth.claims.sub) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const school = await prisma.school.update({
    where: { id: existing.id },
    data: {
      ...(body.name && { name: String(body.name).slice(0, 200) }),
      ...(body.gender && ['mixed', 'girls_only', 'boys_only'].includes(String(body.gender)) && { gender: String(body.gender) }),
      ...(body.description && { description: String(body.description).slice(0, 5000) }),
      ...(body.shortDescription && { shortDescription: String(body.shortDescription).slice(0, 300) }),
      ...(body.phone && { phone: String(body.phone).slice(0, 50) }),
      ...(body.email && { email: String(body.email).slice(0, 200) }),
      ...(body.website !== undefined && { website: body.website || null }),
      ...(body.whatsapp !== undefined && { whatsapp: body.whatsapp || null }),
      ...(body.address && { address: String(body.address).slice(0, 500) }),
      ...(body.city && { city: String(body.city).slice(0, 100) }),
      ...(body.region && { region: String(body.region).slice(0, 100) }),
      ...(body.logo !== undefined && { logo: String(body.logo || '').slice(0, 500) }),
      ...(body.coverImage && { coverImage: body.coverImage }),
      ...(body.gallery !== undefined && { gallery: JSON.stringify(toStringArray(body.gallery)) }),
      ...(body.videos !== undefined && { videos: JSON.stringify(toStringArray(body.videos)) }),
      ...(body.facilities !== undefined && { facilities: JSON.stringify(toStringArray(body.facilities)) }),
      ...(body.dayMin !== undefined && { dayMin: Number(body.dayMin) }),
      ...(body.dayMax !== undefined && { dayMax: Number(body.dayMax) }),
      ...(body.boardingMin !== undefined && { boardingMin: body.boardingMin ? Number(body.boardingMin) : null }),
      ...(body.boardingMax !== undefined && { boardingMax: body.boardingMax ? Number(body.boardingMax) : null }),
      ...(body.latitude !== undefined && { latitude: Number(body.latitude) }),
      ...(body.longitude !== undefined && { longitude: Number(body.longitude) }),
    },
  });

  await logAudit(
    auth.claims.sub,
    auth.claims.name,
    'school.updated',
    'school',
    school.id,
    {
      actorRole: auth.claims.role,
      updatedFields: Object.keys(body || {}).filter(key => [
        'name',
        'gender',
        'description',
        'shortDescription',
        'phone',
        'email',
        'website',
        'whatsapp',
        'address',
        'city',
        'region',
        'country',
        'logo',
        'coverImage',
        'gallery',
        'videos',
        'facilities',
        'dayMin',
        'dayMax',
        'boardingMin',
        'boardingMax',
        'latitude',
        'longitude',
      ].includes(key)),
    }
  );

  return NextResponse.json({ school: serializeSchool(school) });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request, ['admin']);
  if ('response' in auth) return auth.response;

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.school.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
    },
  });
  if (!existing) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 });
  }

  const allowedStatus = ['active', 'pending', 'rejected', 'suspended'];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {};

  if (body.status && allowedStatus.includes(body.status)) data.status = body.status;
  if (body.isVerified !== undefined) data.isVerified = Boolean(body.isVerified);
  if (body.isFeatured !== undefined) data.isFeatured = Boolean(body.isFeatured);
  if (body.isPremium !== undefined) data.isPremium = Boolean(body.isPremium);

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
  }

  const school = await prisma.school.update({ where: { id: existing.id }, data });

  await logAudit(
    auth.claims.sub,
    auth.claims.name,
    'school.moderated',
    'school',
    school.id,
    {
      changes: data,
    }
  );

  return NextResponse.json({ school: serializeSchool(school) });
}
