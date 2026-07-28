import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashSync } from 'bcryptjs';
import { seedSchools, seedReviews } from './seed-data.js';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const schoolImages = [
  'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&h=500&fit=crop',
  'https://images.unsplash.com/photo-1562774053-701939374585?w=800&h=500&fit=crop',
  'https://images.unsplash.com/photo-1592066575517-58df903152f2?w=800&h=500&fit=crop',
  'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&h=500&fit=crop',
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&h=500&fit=crop',
  'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&h=500&fit=crop',
];
const logo = 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=100&h=100&fit=crop';

/** Mirrors slugify() in src/lib/serialize.ts so seeded URLs match real ones. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main() {
  // This seed deletes every row in every table before inserting. Running it
  // against production would destroy real schools, accounts, and payments, so
  // it refuses unless explicitly forced.
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'yes') {
    throw new Error(
      'Refusing to seed with NODE_ENV=production — this deletes all existing data.\n'
      + 'Set ALLOW_PRODUCTION_SEED=yes only if you genuinely intend to wipe the database.'
    );
  }

  console.log('Seeding database...');

  // Clear existing data
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.cmsSection.deleteMany();
  await prisma.review.deleteMany();
  await prisma.schoolSubscription.deleteMany();
  await prisma.subscriptionPlan.deleteMany();
  await prisma.school.deleteMany();
  await prisma.user.deleteMany();

  // Create admin user
  await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@schoolfinder.co.ug',
      password: hashSync('admin123', 10),
      role: 'admin',
    },
  });

  const schoolAdminUser = await prisma.user.create({
    data: {
      name: 'Grace Nakamya',
      email: 'grace@schoolfinder.co.ug',
      password: hashSync('School123', 10),
      role: 'school',
    },
  });

  // Create a parent user
  await prisma.user.create({
    data: {
      name: 'Sarah Namukasa',
      email: 'sarah@example.com',
      password: hashSync('password123', 10),
      role: 'user',
    },
  });

  // Create schools
  //
  // These are real Ugandan schools, so the surrounding data is deliberately
  // handled with care: contact details use the reserved +256 700 000 0XX range
  // and .demo.ug addresses, so a demo enquiry can never reach an actual school's
  // admissions office. Fees, ratings, and reviews are illustrative sample data.
  const schoolSeed = seedSchools;

  const schools = await Promise.all(
    schoolSeed.map((school, index) =>
      prisma.school.create({
        data: {
          id: school.id,
          name: school.name,
          slug: slugify(school.name),
          ownerUserId: school.owned ? schoolAdminUser.id : null,
          // `type` keeps the primary level; `types` holds everything offered.
          type: school.types[0],
          types: school.types,
          category: school.category,
          gender: school.gender,
          description: school.description,
          shortDescription: school.shortDescription,
          logo,
          coverImage: schoolImages[index % schoolImages.length],
          gallery: JSON.stringify([
            schoolImages[index % schoolImages.length],
            schoolImages[(index + 1) % schoolImages.length],
            schoolImages[(index + 2) % schoolImages.length],
          ]),
          address: school.address,
          city: school.city,
          region: school.region,
          country: 'Uganda',
          latitude: school.latitude,
          longitude: school.longitude,
          // Reserved demo range and .demo.ug addresses — a sample enquiry must
          // never reach a real school's admissions office.
          phone: `+256 700 000 ${String(index + 1).padStart(3, '0')}`,
          email: `admissions@${slugify(school.name)}.demo.ug`,
          website: null,
          whatsapp: null,
          currency: 'UGX',
          dayMin: school.dayMin,
          dayMax: school.dayMax,
          facilities: school.facilities,
          rating: school.rating,
          reviewCount: school.reviewCount,
          isVerified: school.isVerified,
          emailVerified: school.isVerified,
          isFeatured: school.isFeatured,
          isPremium: school.isPremium,
          status: school.status ?? 'active',
        },
      })
    )
  );

  // Sample reviews.
  //
  // Counts here must match reviewCount on the matching school above, or the
  // listing will advertise a rating with nothing behind it.
  await prisma.review.createMany({ data: seedReviews });

  await prisma.subscriptionPlan.createMany({
    data: [
      {
        id: 'basic-monthly',
        name: 'Basic',
        price: 99000,
        currency: 'UGX',
        period: 'monthly',
        features: JSON.stringify([
          'School listing on platform',
          'Basic school profile',
          'Up to 5 photos',
          'Contact information display',
          'Monthly analytics report',
        ]),
        isFeatured: false,
        isActive: true,
        sortOrder: 1,
      },
      {
        id: 'premium-monthly',
        name: 'Premium',
        price: 249000,
        currency: 'UGX',
        period: 'monthly',
        features: JSON.stringify([
          'Everything in Basic',
          'Featured listing placement',
          'Unlimited photos & videos',
          'Priority in search results',
          'Verified badge',
          'Real-time analytics dashboard',
          'WhatsApp integration',
          'Promotional banners',
        ]),
        isFeatured: true,
        isActive: true,
        sortOrder: 2,
      },
      {
        id: 'basic-yearly',
        name: 'Basic Annual',
        price: 990000,
        currency: 'UGX',
        period: 'yearly',
        features: JSON.stringify([
          'School listing on platform',
          'Basic school profile',
          'Up to 5 photos',
          'Contact information display',
          'Monthly analytics report',
          '2 months free',
        ]),
        isFeatured: false,
        isActive: true,
        sortOrder: 3,
      },
      {
        id: 'premium-yearly',
        name: 'Premium Annual',
        price: 2490000,
        currency: 'UGX',
        period: 'yearly',
        features: JSON.stringify([
          'Everything in Basic',
          'Featured listing placement',
          'Unlimited photos & videos',
          'Priority in search results',
          'Verified badge',
          'Real-time analytics dashboard',
          'WhatsApp integration',
          'Promotional banners',
          '2 months free',
        ]),
        isFeatured: true,
        isActive: true,
        sortOrder: 4,
      },
    ],
  });

  await prisma.schoolSubscription.createMany({
    data: [
      {
        schoolId: 'sch-1',
        planId: 'premium-monthly',
        status: 'active',
        periodStart: new Date('2026-03-15T00:00:00.000Z'),
        periodEnd: new Date('2026-04-15T00:00:00.000Z'),
        autoRenew: true,
      },
      {
        schoolId: 'sch-2',
        planId: 'premium-yearly',
        status: 'active',
        periodStart: new Date('2026-01-01T00:00:00.000Z'),
        periodEnd: new Date('2027-01-01T00:00:00.000Z'),
        autoRenew: true,
      },
      {
        schoolId: 'sch-3',
        planId: 'premium-monthly',
        status: 'active',
        periodStart: new Date('2026-04-01T00:00:00.000Z'),
        periodEnd: new Date('2026-05-01T00:00:00.000Z'),
        autoRenew: true,
      },
    ],
  });

  const seededSubscriptions = await prisma.schoolSubscription.findMany({
    where: {
      schoolId: { in: ['sch-1', 'sch-2', 'sch-6'] },
    },
    select: {
      id: true,
      schoolId: true,
      planId: true,
      periodStart: true,
    },
  });

  const planPrices: Record<string, number> = {
    'basic-monthly': 99000,
    'premium-monthly': 249000,
    'basic-yearly': 990000,
    'premium-yearly': 2490000,
  };

  await prisma.payment.createMany({
    data: seededSubscriptions.map(subscription => ({
      schoolId: subscription.schoolId,
      subscriptionId: subscription.id,
      amount: planPrices[subscription.planId] || 0,
      currency: 'UGX',
      status: 'paid',
      method: 'mobile_money',
      reference: `seed-${subscription.schoolId}`,
      paidAt: subscription.periodStart,
    })),
  });

  await prisma.lead.createMany({
    data: [
      {
        schoolId: 'sch-1',
        name: 'Aisha Nanyonga',
        email: 'aisha.parent@example.com',
        phone: '+256770111222',
        message: 'I would like to know your admission process for Primary 3.',
        status: 'new',
      },
      {
        schoolId: 'sch-2',
        name: 'David Okot',
        email: 'd.okot@example.com',
        phone: '+256781333444',
        message: 'Please share the boarding requirements and fee structure for P5.',
        status: 'contacted',
      },
      {
        schoolId: 'sch-4',
        name: 'Mariam Atuhaire',
        email: 'mariam@example.com',
        phone: '+256703555666',
        message: 'Do you offer bursaries for A level science students?',
        status: 'qualified',
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: schoolAdminUser.id,
        type: 'lead',
        title: 'New lead assigned',
        message: 'A new parent inquiry has been received for your school profile.',
        link: '/dashboard/leads',
        isRead: false,
      },
      {
        userId: schoolAdminUser.id,
        type: 'subscription',
        title: 'Subscription active',
        message: 'Your premium listing is now active.',
        link: '/dashboard/subscription',
        isRead: true,
      },
    ],
  });

  await prisma.supportTicket.createMany({
    data: [
      {
        submitterName: 'Sarah Namukasa',
        submitterEmail: 'sarah@example.com',
        subject: 'Unable to compare schools',
        message: 'The compare page does not load all selected schools.',
        status: 'open',
        priority: 'high',
      },
      {
        submitterName: 'Grace Nakamya',
        submitterEmail: 'grace@schoolfinder.co.ug',
        subject: 'Need help editing profile gallery',
        message: 'Please assist with updating gallery photos from dashboard.',
        status: 'in_progress',
        priority: 'normal',
      },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      {
        actorId: 'system',
        actorName: 'System Seeder',
        action: 'create',
        resource: 'school',
        resourceId: 'sch-1',
        details: JSON.stringify({ source: 'seed', note: 'Initial school records' }),
      },
      {
        actorId: 'system',
        actorName: 'System Seeder',
        action: 'create',
        resource: 'subscription',
        resourceId: 'sch-2',
        details: JSON.stringify({ source: 'seed', note: 'Initial subscription records' }),
      },
    ],
  });

  await prisma.cmsSection.createMany({
    data: [
      {
        id: 'home-hero',
        title: 'Homepage Hero',
        content: JSON.stringify({
          heading: 'Find the Right School Faster',
          subheading: 'Compare verified schools, fees, and reviews across Uganda.',
          ctaText: 'Browse Schools',
          ctaHref: '/schools',
        }),
        isActive: true,
        sortOrder: 1,
      },
      {
        id: 'home-cta',
        title: 'Homepage CTA',
        content: JSON.stringify({
          heading: 'List Your School',
          subheading: 'Reach more parents with a trusted profile and analytics tools.',
          ctaText: 'Register School',
          ctaHref: '/schools/register',
        }),
        isActive: true,
        sortOrder: 2,
      },
    ],
  });

  console.log(`Seeded ${schools.length} schools, 5 reviews, 3 users, subscriptions, payments, leads, notifications, support tickets, audit logs, and CMS sections`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
