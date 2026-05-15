import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const section = await prisma.cmsSection.findUnique({ where: { id } });
  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 });

  return NextResponse.json({
    id: section.id,
    title: section.title,
    content: (() => { try { return JSON.parse(section.content); } catch { return {}; } })(),
    isActive: section.isActive,
    sortOrder: section.sortOrder,
    updatedAt: section.updatedAt.toISOString(),
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request, ['admin']);
  if ('response' in auth) return auth.response;

  const { id } = await params;
  const body = await request.json();

  const section = await prisma.cmsSection.findUnique({ where: { id } });
  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.content !== undefined) data.content = JSON.stringify(body.content);
  if (body.isActive !== undefined) data.isActive = body.isActive;
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;

  const updated = await prisma.cmsSection.update({ where: { id }, data });

  return NextResponse.json({
    success: true,
    section: {
      id: updated.id,
      title: updated.title,
      content: (() => { try { return JSON.parse(updated.content); } catch { return {}; } })(),
      isActive: updated.isActive,
      sortOrder: updated.sortOrder,
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request, ['admin']);
  if ('response' in auth) return auth.response;

  const { id } = await params;

  const section = await prisma.cmsSection.findUnique({ where: { id } });
  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 });

  await prisma.cmsSection.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
