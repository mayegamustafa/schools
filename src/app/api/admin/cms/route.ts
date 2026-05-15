import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get('active') !== '0';

  const sections = await prisma.cmsSection.findMany({
    where: activeOnly ? { isActive: true } : {},
    orderBy: { sortOrder: 'asc' },
  });

  return NextResponse.json({
    sections: sections.map(s => ({
      id: s.id,
      title: s.title,
      content: (() => { try { return JSON.parse(s.content); } catch { return {}; } })(),
      isActive: s.isActive,
      sortOrder: s.sortOrder,
      updatedAt: s.updatedAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireAuth(request, ['admin']);
  if ('response' in auth) return auth.response;

  const body = await request.json();
  const { id, title, content, isActive, sortOrder } = body;

  if (!id || !title) return NextResponse.json({ error: 'id and title are required' }, { status: 400 });

  const existing = await prisma.cmsSection.findUnique({ where: { id } });
  if (existing) return NextResponse.json({ error: 'Section with this ID already exists' }, { status: 409 });

  const section = await prisma.cmsSection.create({
    data: {
      id,
      title,
      content: JSON.stringify(content || {}),
      isActive: isActive !== false,
      sortOrder: sortOrder || 0,
    },
  });

  return NextResponse.json({ success: true, id: section.id }, { status: 201 });
}
