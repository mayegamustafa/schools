import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DEFAULT_SCHOOL_OPTIONS } from '@/app/api/admin/settings/route';

export async function GET() {
  // Load admin-configured options from CmsSection; fall back to built-in defaults
  const section = await prisma.cmsSection.findFirst({ where: { title: 'school_options' } });

  if (section) {
    try {
      const data = JSON.parse(section.content);
      return NextResponse.json({
        types:      data.types      ?? DEFAULT_SCHOOL_OPTIONS.types,
        categories: data.categories ?? DEFAULT_SCHOOL_OPTIONS.categories,
        genders:    data.genders    ?? DEFAULT_SCHOOL_OPTIONS.genders,
        facilities: data.facilities ?? DEFAULT_SCHOOL_OPTIONS.facilities,
      }, { headers: { 'Cache-Control': 'no-store' } });
    } catch { /* fall through to defaults */ }
  }

  return NextResponse.json(DEFAULT_SCHOOL_OPTIONS, { headers: { 'Cache-Control': 'no-store' } });
}
