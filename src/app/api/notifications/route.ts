import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request: Request) {
  const auth = await requireAuth(request, ['admin', 'school', 'user']);
  if ('response' in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get('unread') === '1';

  const where = {
    userId: auth.claims.sub,
    ...(unreadOnly ? { isRead: false } : {}),
  };

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.notification.count({ where: { userId: auth.claims.sub, isRead: false } }),
  ]);

  return NextResponse.json({
    notifications: notifications.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      isRead: n.isRead,
      link: n.link,
      createdAt: n.createdAt.toISOString(),
    })),
    unreadCount,
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAuth(request, ['admin', 'school', 'user']);
  if ('response' in auth) return auth.response;

  const body = await request.json();
  const { ids, markAll } = body;

  if (markAll) {
    await prisma.notification.updateMany({
      where: { userId: auth.claims.sub, isRead: false },
      data: { isRead: true },
    });
  } else if (Array.isArray(ids) && ids.length > 0) {
    await prisma.notification.updateMany({
      where: { userId: auth.claims.sub, id: { in: ids } },
      data: { isRead: true },
    });
  } else {
    return NextResponse.json({ error: 'Provide ids or markAll=true' }, { status: 400 });
  }

  const unreadCount = await prisma.notification.count({
    where: { userId: auth.claims.sub, isRead: false },
  });

  return NextResponse.json({ success: true, unreadCount });
}
