import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serializeSchool, slugify } from '@/lib/serialize';
import { createAuthToken, requireAuth } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import {
  expandTypeFilter,
  isValidCategory,
  normalizeGender,
  normalizeSchoolTypes,
} from '@/lib/taxonomy';


const MAX_PAGE_SIZE = 60;

/**
 * Media must be an https URL produced by our own upload endpoint. Accepting an
 * arbitrary string would let a client point a listing at any image on the
 * internet — including one that later changes to something else.
 */
function isUploadedImage(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && url.hostname === 'res.cloudinary.com';
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim() || '';
  const type = searchParams.get('type') || '';
  const category = searchParams.get('category') || '';
  const city = searchParams.get('city')?.trim() || '';
  const gender = searchParams.get('gender') || '';
  const minRating = Number(searchParams.get('rating')) || 0;
  const facilities = (searchParams.get('facilities') || '').split(',').filter(Boolean);
  const minFees = Number(searchParams.get('minFees')) || 0;
  const maxFees = Number(searchParams.get('maxFees')) || 0;
  const lat = Number(searchParams.get('lat'));
  const lng = Number(searchParams.get('lng'));
  const radiusKm = Number(searchParams.get('radius')) || 25;
  const near = searchParams.get('near') === '1';
  const sort = searchParams.get('sort') || 'rating';
  const featured = searchParams.get('featured');
  const limit = Number(searchParams.get('limit')) || 0;
  const status = searchParams.get('status') || 'active';
  const ids = searchParams.get('ids');
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, limit || 24));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (status !== 'all') where.status = status;
  if (query) {
    // `mode: 'insensitive'` is required on PostgreSQL — without it Prisma emits a
    // case-sensitive LIKE, so "Kampala" never matched a school named "Kampala …".
    where.OR = [
      { name: { contains: query, mode: 'insensitive' } },
      { city: { contains: query, mode: 'insensitive' } },
      { region: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
    ];
  }
  if (type) {
    // Match the full set a school offers, and expand "secondary" to its O / O&A
    // variants so browse tiles and filter chips find every secondary school.
    where.types = { hasSome: expandTypeFilter(type) };
  }
  if (category) where.category = category;
  if (city) where.city = { equals: city, mode: 'insensitive' };
  if (gender) where.gender = gender;
  if (minRating > 0) where.rating = { gte: minRating };
  if (featured === 'true') where.isFeatured = true;
  if (minFees > 0) where.dayMin = { gte: minFees };
  if (maxFees > 0) where.dayMax = { lte: maxFees, gt: 0 };
  if (ids) where.id = { in: ids.split(',') };
  // Facilities are a native array now, so "must have all of these" is a database
  // filter rather than a post-load JS pass over every school in the table.
  if (facilities.length > 0) where.facilities = { hasEvery: facilities };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let orderBy: any = { rating: 'desc' };
  switch (sort) {
    case 'rating': orderBy = { rating: 'desc' }; break;
    case 'fees-low': orderBy = { dayMin: 'asc' }; break;
    case 'fees-high': orderBy = { dayMax: 'desc' }; break;
    case 'name': orderBy = { name: 'asc' }; break;
    case 'newest': orderBy = { createdAt: 'desc' }; break;
  }

  const toRad = (n: number) => (n * Math.PI) / 180;
  const distanceKm = (aLat: number, aLng: number, bLat: number, bLng: number) => {
    const r = 6371;
    const dLat = toRad(bLat - aLat);
    const dLng = toRad(bLng - aLng);
    const h = Math.sin(dLat / 2) ** 2
      + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
    return 2 * r * Math.asin(Math.sqrt(h));
  };

  const useNear = near && Number.isFinite(lat) && Number.isFinite(lng);

  if (useNear) {
    // Bounding box prefilter in SQL, exact Haversine in JS on the small remainder.
    // 1 degree of latitude ≈ 111km; longitude narrows by cos(latitude).
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.max(0.01, Math.cos(toRad(lat))));
    where.latitude = { gte: lat - latDelta, lte: lat + latDelta };
    where.longitude = { gte: lng - lngDelta, lte: lng + lngDelta };
  }

  if (useNear) {
    // Distance ordering can't be expressed in Prisma's orderBy, so the bounded
    // set is sorted in memory and paginated afterwards.
    const schools = await prisma.school.findMany({ where });
    const ranked = schools
      .map(school => ({
        ...serializeSchool(school),
        distanceKm: distanceKm(lat, lng, school.latitude, school.longitude),
      }))
      .filter(school => school.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return NextResponse.json({
      schools: ranked.slice((page - 1) * pageSize, page * pageSize),
      total: ranked.length,
      page,
      pages: Math.max(1, Math.ceil(ranked.length / pageSize)),
    });
  }

  const [schools, total] = await Promise.all([
    prisma.school.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.school.count({ where }),
  ]);

  return NextResponse.json({
    schools: schools.map(serializeSchool),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

export async function POST(request: Request) {
  // Listings must belong to an account. Previously the token was optional, so an
  // unauthenticated caller could create ownerless schools straight into the
  // moderation queue.
  const auth = await requireAuth(request, ['user', 'school', 'admin']);
  if ('response' in auth) return auth.response;
  const claims = auth.claims;

  const body = await request.json();
  const { name, type, types, category, gender, description, shortDescription,
    phone, email, website, whatsapp,
    address, city, region, country,
    latitude, longitude,
    logo, coverImage, gallery,
    dayMin, dayMax, boardingMin, boardingMax,
    facilities } = body;

  // A school can offer several levels — accept an array, a single value, or the
  // legacy comma-joined string, and keep every valid entry.
  const selectedTypes = normalizeSchoolTypes(types ?? type);

  // Required field validation
  const missing: string[] = [];
  if (!name || String(name).trim().length < 2) missing.push('name');
  if (selectedTypes.length === 0) missing.push('type');
  if (!category) missing.push('category');
  if (!description || String(description).trim().length < 10) missing.push('description');
  if (!phone || String(phone).trim().length < 6) missing.push('phone');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).trim())) missing.push('email');
  if (!address || String(address).trim().length < 5) missing.push('address');
  if (!city || String(city).trim().length < 2) missing.push('city');
  if (!region || String(region).trim().length < 2) missing.push('region');
  // A listing with no badge and no photo is not usable in search results, so
  // both are required at registration rather than "someday in the dashboard".
  if (!isUploadedImage(logo)) missing.push('logo');
  if (!isUploadedImage(coverImage)) missing.push('coverImage');

  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing or invalid required fields: ${missing.join(', ')}` },
      { status: 400 }
    );
  }

  if (!isValidCategory(String(category))) {
    return NextResponse.json({ error: 'Invalid school category' }, { status: 400 });
  }

  const normalizedGender = normalizeGender(gender);

  const parsedDayMin = dayMin !== undefined && String(dayMin).trim() !== '' ? Number(dayMin) : 0;
  const parsedDayMax = dayMax !== undefined && String(dayMax).trim() !== '' ? Number(dayMax) : 0;
  const safeDayMin = Number.isFinite(parsedDayMin) && parsedDayMin > 0 ? parsedDayMin : 0;
  const safeDayMax = Number.isFinite(parsedDayMax) && parsedDayMax > 0 ? parsedDayMax : 0;

  const cleanName = String(name).trim().slice(0, 200);
  const cleanCity = String(city).trim().slice(0, 100);

  // Reject an obvious re-submission of the same listing before it reaches the
  // moderation queue, rather than making an admin spot the duplicate by eye.
  const duplicate = await prisma.school.findFirst({
    where: {
      name: { equals: cleanName, mode: 'insensitive' },
      city: { equals: cleanCity, mode: 'insensitive' },
    },
    select: { id: true },
  });
  if (duplicate) {
    return NextResponse.json(
      { error: 'A school with this name is already listed in this city. Contact support if you believe this is an error.' },
      { status: 409 }
    );
  }

  let slug = slugify(cleanName);
  const existing = await prisma.school.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const school = await prisma.school.create({
    data: {
      name: cleanName,
      slug,
      ownerUserId: claims.sub,
      // `type` keeps the first selected level for legacy consumers.
      type: selectedTypes[0],
      types: selectedTypes,
      category,
      gender: normalizedGender,
      description: String(description).trim().slice(0, 5000),
      shortDescription: String(shortDescription || description).trim().slice(0, 300),
      phone: String(phone).trim().slice(0, 50),
      email: String(email).trim().toLowerCase().slice(0, 200),
      website: website || null,
      whatsapp: whatsapp || null,
      address: String(address).trim().slice(0, 500),
      city: cleanCity,
      region: String(region).trim().slice(0, 100),
      country: country || 'Uganda',
      latitude: Number(latitude) || 0,
      longitude: Number(longitude) || 0,
      logo: String(logo).trim(),
      coverImage: String(coverImage).trim(),
      gallery: JSON.stringify(
        Array.isArray(gallery) ? gallery.filter(isUploadedImage).slice(0, 12) : []
      ),
      dayMin: safeDayMin,
      dayMax: safeDayMax,
      boardingMin: boardingMin ? Number(boardingMin) : null,
      boardingMax: boardingMax ? Number(boardingMax) : null,
      facilities: Array.isArray(facilities)
        ? facilities.map(f => String(f).trim()).filter(Boolean).slice(0, 40)
        : [],
      status: 'pending',
    },
  });

  // A parent account that registers a school becomes a school owner. The role also
  // has to be re-minted into a fresh token and cookie — the middleware gates
  // /dashboard on the role baked into the token, so updating only the database
  // would leave the new owner locked out of their own dashboard.
  let refreshedToken: string | null = null;
  if (claims.role === 'user') {
    await prisma.user.update({
      where: { id: claims.sub },
      data: { role: 'school' },
    });

    refreshedToken = await createAuthToken({
      id: claims.sub,
      name: claims.name,
      email: claims.email,
      role: 'school',
    });
  }

  const response = NextResponse.json(
    {
      school: serializeSchool(school),
      ...(refreshedToken ? { token: refreshedToken, role: 'school' } : {}),
    },
    { status: 201 }
  );

  if (refreshedToken) {
    response.cookies.set('sf_token', refreshedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    });
  }

  await logAudit(claims.sub, claims.name, 'school.registered', 'school', school.id, {
    types: selectedTypes,
    city: cleanCity,
    roleUpgraded: Boolean(refreshedToken),
  });

  return response;
}
