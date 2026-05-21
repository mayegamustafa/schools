import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serializeSchool, slugify } from '@/lib/serialize';
import { getBearerToken, verifyAuthToken } from '@/lib/auth';


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.toLowerCase() || '';
  const type = searchParams.get('type') || '';
  const category = searchParams.get('category') || '';
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (status !== 'all') where.status = status;
  if (query) {
    where.OR = [
      { name: { contains: query } },
      { city: { contains: query } },
      { region: { contains: query } },
      { description: { contains: query } },
    ];
  }
  if (type) where.type = type;
  if (category) where.category = category;
  if (gender) where.gender = gender;
  if (minRating > 0) where.rating = { gte: minRating };
  if (featured === 'true') where.isFeatured = true;
  if (minFees > 0) where.dayMin = { gte: minFees };
  if (maxFees > 0) where.dayMax = { lte: maxFees, gt: 0 };
  if (ids) where.id = { in: ids.split(',') };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let orderBy: any = { rating: 'desc' };
  switch (sort) {
    case 'rating': orderBy = { rating: 'desc' }; break;
    case 'fees-low': orderBy = { dayMin: 'asc' }; break;
    case 'fees-high': orderBy = { dayMax: 'desc' }; break;
    case 'name': orderBy = { name: 'asc' }; break;
    case 'newest': orderBy = { createdAt: 'desc' }; break;
  }

  const schools = await prisma.school.findMany({
    where,
    orderBy,
  });

  const toRad = (n: number) => (n * Math.PI) / 180;
  const distanceKm = (aLat: number, aLng: number, bLat: number, bLng: number) => {
    const r = 6371;
    const dLat = toRad(bLat - aLat);
    const dLng = toRad(bLng - aLng);
    const h = Math.sin(dLat / 2) ** 2
      + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
    return 2 * r * Math.asin(Math.sqrt(h));
  };

  let result = schools.map(serializeSchool);

  if (facilities.length > 0) {
    result = result.filter(s => facilities.every(f => s.facilities.includes(f)));
  }

  if (near && Number.isFinite(lat) && Number.isFinite(lng)) {
    result = result
      .map(s => ({
        ...s,
        distanceKm: distanceKm(lat, lng, s.location.latitude, s.location.longitude),
      }))
      .filter(s => s.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  if (limit > 0) {
    result = result.slice(0, limit);
  }

  return NextResponse.json({
    schools: result,
    total: result.length,
  });
}

export async function POST(request: Request) {
  const bearerToken = getBearerToken(request);
  const claims = bearerToken ? await verifyAuthToken(bearerToken) : null;

  const body = await request.json();
  const { name, type, category, gender, description, shortDescription,
    phone, email, website, whatsapp,
    address, city, region, country,
    latitude, longitude,
    dayMin, dayMax, boardingMin, boardingMax,
    facilities } = body;

  // Required field validation
  const missing: string[] = [];
  if (!name || String(name).trim().length < 2) missing.push('name');
  if (!type) missing.push('type');
  if (!category) missing.push('category');
  if (!description || String(description).trim().length < 10) missing.push('description');
  if (!phone || String(phone).trim().length < 6) missing.push('phone');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).trim())) missing.push('email');
  if (!address || String(address).trim().length < 5) missing.push('address');
  if (!city || String(city).trim().length < 2) missing.push('city');
  if (!region || String(region).trim().length < 2) missing.push('region');

  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing or invalid required fields: ${missing.join(', ')}` },
      { status: 400 }
    );
  }

  const VALID_TYPES = ['daycare', 'kindergarten', 'primary', 'secondary', 'secondary_o', 'secondary_oa', 'tertiary', 'university'];
  if (!VALID_TYPES.includes(String(type))) {
    return NextResponse.json({ error: 'Invalid school type' }, { status: 400 });
  }

  const VALID_CATEGORIES = ['day', 'boarding', 'mixed'];
  if (!VALID_CATEGORIES.includes(String(category))) {
    return NextResponse.json({ error: 'Invalid school category' }, { status: 400 });
  }

  const normalizedGender = ['mixed', 'girls_only', 'boys_only'].includes(String(gender))
    ? String(gender)
    : 'mixed';

  const parsedDayMin = dayMin !== undefined && String(dayMin).trim() !== '' ? Number(dayMin) : 0;
  const parsedDayMax = dayMax !== undefined && String(dayMax).trim() !== '' ? Number(dayMax) : 0;
  const safeDayMin = Number.isFinite(parsedDayMin) && parsedDayMin > 0 ? parsedDayMin : 0;
  const safeDayMax = Number.isFinite(parsedDayMax) && parsedDayMax > 0 ? parsedDayMax : 0;

  let slug = slugify(name);
  const existing = await prisma.school.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const school = await prisma.school.create({
    data: {
      name: String(name).trim().slice(0, 200),
      slug,
      ownerUserId: claims?.sub || null,
      type,
      category,
      gender: normalizedGender,
      description: String(description).trim().slice(0, 5000),
      shortDescription: String(shortDescription || description).trim().slice(0, 300),
      phone: String(phone).trim().slice(0, 50),
      email: String(email).trim().toLowerCase().slice(0, 200),
      website: website || null,
      whatsapp: whatsapp || null,
      address: String(address).trim().slice(0, 500),
      city: String(city).trim().slice(0, 100),
      region: String(region).trim().slice(0, 100),
      country: country || 'Uganda',
      latitude: Number(latitude) || 0,
      longitude: Number(longitude) || 0,
      dayMin: safeDayMin,
      dayMax: safeDayMax,
      boardingMin: boardingMin ? Number(boardingMin) : null,
      boardingMax: boardingMax ? Number(boardingMax) : null,
      facilities: JSON.stringify(facilities || []),
      status: 'pending',
    },
  });

  return NextResponse.json({ school: serializeSchool(school) }, { status: 201 });
}
