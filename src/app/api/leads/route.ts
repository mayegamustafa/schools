import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

export async function GET(request: Request) {
  const auth = await requireAuth(request, ['admin', 'school']);
  if ('response' in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get('schoolId');
  const status = searchParams.get('status');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (auth.claims.role === 'school') {
    const school = await prisma.school.findFirst({
      where: { ownerUserId: auth.claims.sub, ...(schoolId ? { id: schoolId } : {}) },
      select: { id: true },
    });
    if (!school) return NextResponse.json({ error: 'School not found' }, { status: 404 });
    where.schoolId = school.id;
  } else if (schoolId) {
    where.schoolId = schoolId;
  }

  if (status && status !== 'all') where.status = status;

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { school: { select: { name: true, slug: true } } },
    }),
    prisma.lead.count({ where }),
  ]);

  return NextResponse.json({
    leads: leads.map(l => ({
      id: l.id,
      schoolId: l.schoolId,
      schoolName: l.school.name,
      name: l.name,
      email: l.email,
      phone: l.phone,
      message: l.message,
      status: l.status,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}

const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: Request) {
  // Unauthenticated endpoint that writes straight into a paying customer's inbox.
  const limit = rateLimit(request, 'lead', { limit: 5, windowMs: 10 * 60 * 1000 });
  if (!limit.ok) return rateLimitResponse(limit);

  const body = await request.json();
  const { schoolId, name, email, phone, message } = body;

  if (!schoolId || !name || !email || !message) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const cleanName = String(name).trim().slice(0, 100);
  const cleanEmail = String(email).trim().toLowerCase().slice(0, 200);
  const cleanMessage = String(message).trim().slice(0, 2000);
  const cleanPhone = phone ? String(phone).trim().slice(0, 50) : null;

  if (cleanName.length < 2) {
    return NextResponse.json({ error: 'Please enter your name' }, { status: 400 });
  }
  if (!EMAIL_RULE.test(cleanEmail)) {
    return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
  }
  if (cleanMessage.length < 10) {
    return NextResponse.json({ error: 'Please write a slightly longer message' }, { status: 400 });
  }

  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { id: true, ownerUserId: true } });
  if (!school) return NextResponse.json({ error: 'School not found' }, { status: 404 });

  const lead = await prisma.lead.create({
    data: {
      schoolId,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      message: cleanMessage,
      status: 'new',
    },
  });

  if (school.ownerUserId) {
    await prisma.notification.create({
      data: {
        userId: school.ownerUserId,
        type: 'lead',
        title: 'New inquiry received',
        message: `${cleanName} sent an inquiry about your school.`,
        link: '/dashboard?tab=leads',
      },
    });
  }

  await logAudit('public', cleanName, 'lead.created', 'lead', lead.id, {
    schoolId,
    email: cleanEmail,
  });

  return NextResponse.json({ success: true, id: lead.id }, { status: 201 });
}
