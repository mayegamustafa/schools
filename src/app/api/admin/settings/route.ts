import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  DEFAULT_SCHOOL_OPTIONS,
  DEFAULT_BRAND,
  DEFAULT_SITE_CONTENT,
} from '@/lib/site-defaults';

export { DEFAULT_SCHOOL_OPTIONS, DEFAULT_BRAND, DEFAULT_SITE_CONTENT };

const SCHOOL_OPTIONS_TITLE = 'school_options';
const BRAND_SETTINGS_TITLE = 'brand_settings';
export const SITE_CONTENT_TITLE = 'site_content';

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

  const [optionsSection, brandSection, contentSection] = await Promise.all([
    getSection(SCHOOL_OPTIONS_TITLE),
    getSection(BRAND_SETTINGS_TITLE),
    getSection(SITE_CONTENT_TITLE),
  ]);

  return NextResponse.json({
    schoolOptions: parseSection(optionsSection, DEFAULT_SCHOOL_OPTIONS),
    brandSettings: parseSection(brandSection, DEFAULT_BRAND),
    siteContent: parseSection(contentSection, DEFAULT_SITE_CONTENT),
  });
}

export async function PUT(request: Request) {
  const auth = await requireAuth(request, ['admin']);
  if ('response' in auth) return auth.response;

  const body = await request.json();
  const { kind, data } = body as { kind: 'options' | 'brand' | 'content'; data: object };

  if (kind === 'options') {
    await upsertSection(SCHOOL_OPTIONS_TITLE, data);
    return NextResponse.json({ success: true });
  }

  if (kind === 'brand') {
    await upsertSection(BRAND_SETTINGS_TITLE, data);
    return NextResponse.json({ success: true });
  }

  if (kind === 'content') {
    await upsertSection(SITE_CONTENT_TITLE, data);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
}
