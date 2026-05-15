import { prisma } from '@/lib/prisma';

export type AuditDetails = Record<string, unknown>;

export async function logAudit(
  actorId: string,
  actorName: string,
  action: string,
  resource: string,
  resourceId?: string,
  details?: AuditDetails
) {
  await prisma.auditLog.create({
    data: {
      actorId,
      actorName,
      action,
      resource,
      resourceId: resourceId || null,
      details: JSON.stringify(details || {}),
    },
  });
}
