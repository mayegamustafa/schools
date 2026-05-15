import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

function serializeConversation(conversation: {
  id: string;
  schoolId: string;
  subject: string;
  status: string;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
  school: { name: string; slug: string; ownerUserId: string | null };
  user: { id: string; name: string; email: string };
  messages: Array<{
    id: string;
    conversationId: string;
    senderId: string;
    senderRole: string;
    content: string;
    isRead: boolean;
    createdAt: Date;
    sender: { name: string };
  }>;
}) {
  const lastMessage = conversation.messages[0];

  return {
    id: conversation.id,
    schoolId: conversation.schoolId,
    schoolName: conversation.school.name,
    schoolSlug: conversation.school.slug,
    userId: conversation.user.id,
    userName: conversation.user.name,
    userEmail: conversation.user.email,
    subject: conversation.subject,
    status: conversation.status,
    lastMessageAt: conversation.lastMessageAt.toISOString(),
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    unreadCount: conversation.messages.filter(message => !message.isRead).length,
    lastMessage: lastMessage
      ? {
          id: lastMessage.id,
          conversationId: lastMessage.conversationId,
          senderId: lastMessage.senderId,
          senderName: lastMessage.sender.name,
          senderRole: lastMessage.senderRole,
          content: lastMessage.content,
          isRead: lastMessage.isRead,
          createdAt: lastMessage.createdAt.toISOString(),
        }
      : undefined,
  };
}

export async function GET(request: Request) {
  const auth = await requireAuth(request, ['admin', 'school', 'user']);
  if ('response' in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const status = (searchParams.get('status') || '').trim();
  const schoolId = (searchParams.get('schoolId') || '').trim();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (status && status !== 'all') where.status = status;

  if (auth.claims.role === 'school') {
    const school = await prisma.school.findFirst({
      where: { ownerUserId: auth.claims.sub, ...(schoolId ? { id: schoolId } : {}) },
      select: { id: true },
    });
    if (!school) return NextResponse.json({ error: 'School profile not found' }, { status: 404 });
    where.schoolId = school.id;
  } else if (auth.claims.role === 'user') {
    where.userId = auth.claims.sub;
  } else if (schoolId) {
    where.schoolId = schoolId;
  }

  const conversations = await prisma.conversation.findMany({
    where,
    include: {
      school: { select: { name: true, slug: true, ownerUserId: true } },
      user: { select: { id: true, name: true, email: true } },
      messages: {
        include: { sender: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
    orderBy: { lastMessageAt: 'desc' },
  });

  return NextResponse.json({
    conversations: conversations.map(serializeConversation),
  });
}

export async function POST(request: Request) {
  const auth = await requireAuth(request, ['user', 'admin']);
  if ('response' in auth) return auth.response;

  const body = await request.json();
  const schoolId = String(body.schoolId || '').trim();
  const subject = String(body.subject || '').trim();
  const message = String(body.message || '').trim();

  if (!schoolId || !subject || !message) {
    return NextResponse.json({ error: 'schoolId, subject, and message are required' }, { status: 400 });
  }

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { id: true, name: true, slug: true, ownerUserId: true },
  });

  if (!school) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 });
  }

  const conversation = await prisma.conversation.create({
    data: {
      schoolId: school.id,
      userId: auth.claims.sub,
      subject: subject.slice(0, 200),
      messages: {
        create: {
          senderId: auth.claims.sub,
          senderRole: String(auth.claims.role),
          content: message.slice(0, 5000),
          isRead: false,
        },
      },
    },
    include: {
      school: { select: { name: true, slug: true, ownerUserId: true } },
      user: { select: { id: true, name: true, email: true } },
      messages: {
        include: { sender: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  if (school.ownerUserId) {
    await prisma.notification.create({
      data: {
        userId: school.ownerUserId,
        type: 'conversation',
        title: 'New conversation started',
        message: `${auth.claims.name} sent a message about ${school.name}.`,
        link: '/dashboard/messages',
      },
    });
  }

  await logAudit(auth.claims.sub, auth.claims.name, 'conversation.created', 'conversation', conversation.id, {
    schoolId: school.id,
    subject: conversation.subject,
  });

  return NextResponse.json({ conversation: serializeConversation(conversation) }, { status: 201 });
}