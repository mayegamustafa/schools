import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { hashSync } from 'bcryptjs';

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request, ['admin']);
  if ('response' in auth) return auth.response;

  const { id } = await params;
  const body = await request.json();

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const allowedRoles = ['user', 'school', 'admin'];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {};

  if (body.role && allowedRoles.includes(body.role)) {
    data.role = body.role;
  }
  if (body.name) data.name = String(body.name).slice(0, 100);
  if (body.password) {
    if (!PASSWORD_RULE.test(String(body.password))) {
      return NextResponse.json(
        { error: 'Password must be 8+ chars with uppercase, lowercase, and a number' },
        { status: 400 }
      );
    }
    data.password = hashSync(String(body.password), 10);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
  }

  const updated = await prisma.user.update({ where: { id }, data });

  await logAudit(auth.claims.sub, auth.claims.name, 'user.updated', 'user', updated.id, {
    updatedFields: Object.keys(data),
  });

  return NextResponse.json({
    user: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      createdAt: updated.createdAt.toISOString(),
    },
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request, ['admin']);
  if ('response' in auth) return auth.response;

  const { id } = await params;

  if (id === auth.claims.sub) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  await prisma.user.delete({ where: { id } });

  await logAudit(auth.claims.sub, auth.claims.name, 'user.deleted', 'user', user.id, {
    email: user.email,
    role: user.role,
  });

  return NextResponse.json({ success: true });
}
