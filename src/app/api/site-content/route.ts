import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DEFAULT_SITE_CONTENT } from '@/lib/site-defaults';

const SITE_CONTENT_TITLE = 'site_content';

export async function GET() {
  try {
    const section = await prisma.cmsSection.findFirst({ where: { title: SITE_CONTENT_TITLE } });
    if (section) {
      const data = JSON.parse(section.content);
      return NextResponse.json(
        { ...DEFAULT_SITE_CONTENT, ...data },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }
  } catch { /* fall through to defaults */ }

  return NextResponse.json(DEFAULT_SITE_CONTENT, { headers: { 'Cache-Control': 'no-store' } });
}
