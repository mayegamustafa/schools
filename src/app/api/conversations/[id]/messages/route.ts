import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

async function getConversationForActor(id: string, actorId: string, actorRole: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      school: { select: { id: true, name: true, ownerUserId: true } },
      user: { select: { id: true, name: true } },
    },
  });

  if (!conversation) return null;
  if (actorRole === 'admin') return conversation;
  if (conversation.userId === actorId) return conversation;
  if (conversation.school.ownerUserId === actorId) return conversation;
  return 'forbidden' as const;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request, ['admin', 'school', 'user']);
  if ('response' in auth) return auth.response;

  const { id } = await params;
  const conversation = await getConversationForActor(id, auth.claims.sub, String(auth.claims.role));

  if (!conversation) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  if (conversation === 'forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    include: { sender: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({
    messages: messages.map(message => ({
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderName: message.sender.name,
      senderRole: message.senderRole,
      content: message.content,
      isRead: message.isRead,
      createdAt: message.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request, ['admin', 'school', 'user']);
  if ('response' in auth) return auth.response;

  const { id } = await params;
  const conversation = await getConversationForActor(id, auth.claims.sub, String(auth.claims.role));

  if (!conversation) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  if (conversation === 'forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const content = String(body.content || '').trim();
  if (!content) {
    return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
  }

  const senderRole = auth.claims.role === 'school' ? 'school' : auth.claims.role === 'admin' ? 'admin' : 'user';
  const message = await prisma.message.create({
    data: {
      conversationId: id,
      senderId: auth.claims.sub,
      senderRole,
      content: content.slice(0, 5000),
      isRead: false,
    },
    include: { sender: { select: { name: true } } },
  });

  await prisma.conversation.update({
    where: { id },
    data: { lastMessageAt: new Date(), status: 'open' },
  });

  const recipientId = senderRole === 'school'
    ? conversation.user.id
    : conversation.school.ownerUserId;

  if (recipientId) {
    await prisma.notification.create({
      data: {
        userId: recipientId,
        type: 'message',
        title: 'New message received',
        message: `${auth.claims.name} replied in "${conversation.subject}".`,
        link: senderRole === 'school' ? '/messages' : '/dashboard/messages',
      },
    });
  }

  await logAudit(auth.claims.sub, auth.claims.name, 'message.sent', 'conversation', id, {
    senderRole,
    messageId: message.id,
  });

  return NextResponse.json({
    message: {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderName: message.sender.name,
      senderRole: message.senderRole,
      content: message.content,
      isRead: message.isRead,
      createdAt: message.createdAt.toISOString(),
    },
  }, { status: 201 });
}