import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

async function getAuthorizedConversation(id: string, actorId: string, actorRole: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      school: { select: { id: true, name: true, slug: true, ownerUserId: true } },
      user: { select: { id: true, name: true, email: true } },
      messages: {
        include: { sender: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!conversation) return null;

  const canAccess = actorRole === 'admin'
    || conversation.userId === actorId
    || conversation.school.ownerUserId === actorId;

  if (!canAccess) return 'forbidden' as const;
  return conversation;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request, ['admin', 'school', 'user']);
  if ('response' in auth) return auth.response;

  const { id } = await params;
  const conversation = await getAuthorizedConversation(id, auth.claims.sub, String(auth.claims.role));

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }
  if (conversation === 'forbidden') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (auth.claims.role === 'school') {
    await prisma.message.updateMany({
      where: {
        conversationId: conversation.id,
        senderRole: 'user',
        isRead: false,
      },
      data: { isRead: true },
    });
  }

  if (auth.claims.role === 'user') {
    await prisma.message.updateMany({
      where: {
        conversationId: conversation.id,
        senderRole: 'school',
        isRead: false,
      },
      data: { isRead: true },
    });
  }

  return NextResponse.json({
    conversation: {
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
      messages: conversation.messages.map(message => ({
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        senderName: message.sender.name,
        senderRole: message.senderRole,
        content: message.content,
        isRead: message.isRead,
        createdAt: message.createdAt.toISOString(),
      })),
    },
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request, ['admin', 'school', 'user']);
  if ('response' in auth) return auth.response;

  const { id } = await params;
  const conversation = await getAuthorizedConversation(id, auth.claims.sub, String(auth.claims.role));

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }
  if (conversation === 'forbidden') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const status = String(body.status || '').trim();
  if (!['open', 'closed'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const updated = await prisma.conversation.update({
    where: { id: conversation.id },
    data: { status },
  });

  await logAudit(auth.claims.sub, auth.claims.name, 'conversation.updated', 'conversation', updated.id, {
    status,
  });

  return NextResponse.json({ success: true, status: updated.status });
}