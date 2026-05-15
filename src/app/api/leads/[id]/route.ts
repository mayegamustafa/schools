import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request, ['admin', 'school']);
  if ('response' in auth) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const { status } = body;

  const allowed = ['new', 'contacted', 'qualified', 'closed'];
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const lead = await prisma.lead.findUnique({ where: { id }, include: { school: { select: { ownerUserId: true } } } });
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  if (auth.claims.role === 'school' && lead.school.ownerUserId !== auth.claims.sub) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const updated = await prisma.lead.update({ where: { id }, data: { status } });

  await logAudit(auth.claims.sub, auth.claims.name, 'lead.updated', 'lead', updated.id, {
    status,
  });

  return NextResponse.json({ success: true, status: updated.status });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request, ['admin', 'school']);
  if ('response' in auth) return auth.response;

  const { id } = await params;

  const lead = await prisma.lead.findUnique({ where: { id }, include: { school: { select: { ownerUserId: true } } } });
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  if (auth.claims.role === 'school' && lead.school.ownerUserId !== auth.claims.sub) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.lead.delete({ where: { id } });

  await logAudit(auth.claims.sub, auth.claims.name, 'lead.deleted', 'lead', lead.id, {
    schoolId: lead.schoolId,
  });

  return NextResponse.json({ success: true });
}
