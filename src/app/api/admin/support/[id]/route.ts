import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request, ['admin']);
  if ('response' in auth) return auth.response;

  const { id } = await params;
  const body = await request.json();

  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

  const allowedStatuses = ['open', 'in_progress', 'resolved', 'closed'];
  const allowedPriorities = ['low', 'normal', 'high', 'urgent'];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {};
  if (body.status !== undefined) {
    if (!allowedStatuses.includes(body.status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    data.status = body.status;
  }
  if (body.priority !== undefined) {
    if (!allowedPriorities.includes(body.priority)) return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
    data.priority = body.priority;
  }
  if (body.adminNote !== undefined) data.adminNote = body.adminNote;

  const updated = await prisma.supportTicket.update({ where: { id }, data });

  await logAudit(auth.claims.sub, auth.claims.name, 'support.updated', 'support-ticket', updated.id, {
    updatedFields: Object.keys(data),
  });

  return NextResponse.json({ success: true, ticket: updated });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request, ['admin']);
  if ('response' in auth) return auth.response;

  const { id } = await params;

  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

  await prisma.supportTicket.delete({ where: { id } });

  await logAudit(auth.claims.sub, auth.claims.name, 'support.deleted', 'support-ticket', ticket.id, {
    subject: ticket.subject,
  });

  return NextResponse.json({ success: true });
}
