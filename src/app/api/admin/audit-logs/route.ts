import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request: Request) {
  const auth = await requireAuth(request, ['admin']);
  if ('response' in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, parseInt(searchParams.get('limit') || '30'));
  const action = searchParams.get('action');
  const resource = searchParams.get('resource');
  const q = (searchParams.get('q') || '').trim();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (action && action !== 'all') where.action = action;
  if (resource && resource !== 'all') where.resource = resource;
  if (q) {
    where.OR = [
      { actorName: { contains: q } },
      { resource: { contains: q } },
      { action: { contains: q } },
    ];
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json({
    logs: logs.map(l => ({
      id: l.id,
      actorId: l.actorId,
      actorName: l.actorName,
      action: l.action,
      resource: l.resource,
      resourceId: l.resourceId,
      details: (() => { try { return JSON.parse(l.details); } catch { return {}; } })(),
      createdAt: l.createdAt.toISOString(),
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}
