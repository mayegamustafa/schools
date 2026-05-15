import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

const SCHOOL_OPTIONS_TITLE = 'school_options';
const BRAND_SETTINGS_TITLE = 'brand_settings';

export const DEFAULT_SCHOOL_OPTIONS = {
  types: [
    { value: 'kindergarten', label: 'Kindergarten' },
    { value: 'primary', label: 'Primary School' },
    { value: 'secondary', label: 'Secondary School' },
    { value: 'university', label: 'University' },
    { value: 'daycare', label: 'Daycare' },
  ],
  categories: [
    { value: 'day', label: 'Day School' },
    { value: 'boarding', label: 'Boarding School' },
    { value: 'mixed', label: 'Day & Boarding' },
  ],
  genders: [
    { value: 'mixed', label: 'Mixed (Boys & Girls)' },
    { value: 'girls_only', label: 'Girls Only' },
    { value: 'boys_only', label: 'Boys Only' },
  ],
  facilities: [
    'Library', 'Computer Lab', 'Sports Field', 'Cafeteria',
    'Boarding House', 'Science Lab', 'Art Room', 'Music Room',
    'Swimming Pool', 'Chapel/Mosque',
  ],
};

export const DEFAULT_BRAND = {
  primaryColor: '#2d3640',
  accentColor: '#8b7355',
  successColor: '#446c56',
  errorColor: '#904545',
};

async function getSection(title: string) {
  return prisma.cmsSection.findFirst({ where: { title } });
}

async function upsertSection(title: string, content: object) {
  const existing = await getSection(title);
  if (existing) {
    return prisma.cmsSection.update({
      where: { id: existing.id },
      data: { content: JSON.stringify(content) },
    });
  }
  return prisma.cmsSection.create({
    data: { id: crypto.randomUUID(), title, content: JSON.stringify(content), isActive: true, sortOrder: 0 },
  });
}

function parseSection<T>(section: { content: string } | null, defaults: T): T {
  if (!section) return defaults;
  try { return { ...defaults, ...JSON.parse(section.content) } as T; } catch { return defaults; }
}

export async function GET(request: Request) {
  const auth = await requireAuth(request, ['admin']);
  if ('response' in auth) return auth.response;

  const [optionsSection, brandSection] = await Promise.all([
    getSection(SCHOOL_OPTIONS_TITLE),
    getSection(BRAND_SETTINGS_TITLE),
  ]);

  return NextResponse.json({
    schoolOptions: parseSection(optionsSection, DEFAULT_SCHOOL_OPTIONS),
    brandSettings: parseSection(brandSection, DEFAULT_BRAND),
  });
}

export async function PUT(request: Request) {
  const auth = await requireAuth(request, ['admin']);
  if ('response' in auth) return auth.response;

  const body = await request.json();
  const { kind, data } = body as { kind: 'options' | 'brand'; data: object };

  if (kind === 'options') {
    await upsertSection(SCHOOL_OPTIONS_TITLE, data);
    return NextResponse.json({ success: true });
  }

  if (kind === 'brand') {
    await upsertSection(BRAND_SETTINGS_TITLE, data);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
}
