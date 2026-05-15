import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET(request: Request) {
  const auth = await requireAuth(request, ['admin']);
  if ('response' in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'));
  const status = searchParams.get('status');
  const priority = searchParams.get('priority');
  const q = (searchParams.get('q') || '').trim();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (status && status !== 'all') where.status = status;
  if (priority && priority !== 'all') where.priority = priority;
  if (q) {
    where.OR = [
      { subject: { contains: q } },
      { submitterName: { contains: q } },
      { submitterEmail: { contains: q } },
    ];
  }

  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.supportTicket.count({ where }),
  ]);

  const [openCount, resolvedCount, urgentCount] = await Promise.all([
    prisma.supportTicket.count({ where: { status: 'open' } }),
    prisma.supportTicket.count({ where: { status: 'resolved' } }),
    prisma.supportTicket.count({ where: { priority: 'urgent' } }),
  ]);

  return NextResponse.json({
    tickets: tickets.map(t => ({
      id: t.id,
      submitterName: t.submitterName,
      submitterEmail: t.submitterEmail,
      subject: t.subject,
      message: t.message,
      status: t.status,
      priority: t.priority,
      adminNote: t.adminNote,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
    summary: { openCount, resolvedCount, urgentCount },
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { submitterName, submitterEmail, subject, message } = body;

  if (!submitterName || !submitterEmail || !subject || !message) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      submitterName,
      submitterEmail: submitterEmail.toLowerCase(),
      subject,
      message,
      status: 'open',
      priority: 'normal',
    },
  });

  await logAudit('public', submitterName, 'support.created', 'support-ticket', ticket.id, {
    submitterEmail: submitterEmail.toLowerCase(),
    subject,
  });

  return NextResponse.json({ success: true, id: ticket.id }, { status: 201 });
}
