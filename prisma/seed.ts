import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashSync } from 'bcryptjs';

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

async function main() {
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
  const schools = await Promise.all([
    prisma.school.create({
      data: {
        id: 'sch-1',
        name: 'Kampala Junior Academy',
        slug: 'kampala-junior-academy',
        ownerUserId: schoolAdminUser.id,
        type: 'primary',
        category: 'day',
        gender: 'mixed',
        description: 'Kampala Junior Academy is a premier primary school committed to nurturing young minds through innovative teaching methods and a supportive learning environment. Our experienced educators focus on developing critical thinking, creativity, and social skills in every student. With state-of-the-art facilities and a comprehensive curriculum, we prepare students for success in their academic journey and beyond.',
        shortDescription: 'A premier primary school committed to nurturing young minds through innovative teaching.',
        logo,
        coverImage: schoolImages[0],
        gallery: JSON.stringify([schoolImages[0], schoolImages[1], schoolImages[2]]),
        address: '12 Bombo Road',
        city: 'Kampala',
        region: 'Central Region',
        country: 'Uganda',
        latitude: 0.3476,
        longitude: 32.5825,
        phone: '+256 700 123 456',
        email: 'info@kampalajunior.ac.ug',
        website: 'https://kampalajunior.ac.ug',
        whatsapp: '+256700123456',
        currency: 'UGX',
        dayMin: 800000,
        dayMax: 1500000,
        facilities: JSON.stringify(['Transport', 'Library', 'Science Labs', 'Computer Lab', 'Sports Field', 'Cafeteria', 'Playground', 'WiFi', 'Security']),
        rating: 4.7,
        reviewCount: 3,
        isVerified: true,
        isFeatured: true,
        isPremium: true,
        status: 'active',
      },
    }),
    prisma.school.create({
      data: {
        id: 'sch-2',
        name: 'Jinja Boarding School',
        slug: 'jinja-boarding-school',
        ownerUserId: schoolAdminUser.id,
        type: 'secondary',
        category: 'boarding',
        gender: 'boys_only',
        description: 'Jinja Boarding School offers a world-class boarding education that combines academic excellence with character development. Our serene campus located near the source of the Nile provides the perfect environment for focused learning. Students enjoy access to modern laboratories, extensive sports facilities, and a vibrant arts program.',
        shortDescription: 'World-class boarding education combining academic excellence with character development.',
        logo,
        coverImage: schoolImages[1],
        gallery: JSON.stringify([schoolImages[1], schoolImages[3], schoolImages[4]]),
        address: '45 Main Street',
        city: 'Jinja',
        region: 'Eastern Region',
        country: 'Uganda',
        latitude: 0.4244,
        longitude: 33.2041,
        phone: '+256 711 234 567',
        email: 'admissions@jinjaboarding.ac.ug',
        website: 'https://jinjaboarding.ac.ug',
        whatsapp: '+256711234567',
        currency: 'UGX',
        dayMin: 1200000,
        dayMax: 1800000,
        boardingMin: 2500000,
        boardingMax: 3500000,
        facilities: JSON.stringify(['Transport', 'Library', 'Science Labs', 'Computer Lab', 'Sports Field', 'Swimming Pool', 'Dormitory', 'Cafeteria', 'Medical Center', 'WiFi', 'Security', 'Chapel/Mosque']),
        rating: 4.5,
        reviewCount: 1,
        isVerified: true,
        isFeatured: false,
        isPremium: true,
        status: 'active',
      },
    }),
    prisma.school.create({
      data: {
        id: 'sch-3',
        name: 'Little Stars Kindergarten',
        slug: 'little-stars-kindergarten',
        type: 'kindergarten',
        category: 'day',
        gender: 'mixed',
        description: 'Little Stars Kindergarten provides a warm, nurturing environment where young children take their first steps in education. Our play-based curriculum is designed to develop cognitive, social, and motor skills through engaging activities. Every child is treated as unique, with personalized attention from our qualified early childhood educators.',
        shortDescription: 'A warm, nurturing kindergarten with play-based learning for early childhood development.',
        logo,
        coverImage: schoolImages[2],
        gallery: JSON.stringify([schoolImages[2], schoolImages[5], schoolImages[0]]),
        address: '8 Entebbe Road',
        city: 'Entebbe',
        region: 'Central Region',
        country: 'Uganda',
        latitude: 0.0512,
        longitude: 32.4637,
        phone: '+256 722 345 678',
        email: 'hello@littlestars.ac.ug',
        whatsapp: '+256722345678',
        currency: 'UGX',
        dayMin: 400000,
        dayMax: 750000,
        facilities: JSON.stringify(['Playground', 'Cafeteria', 'Security', 'Transport']),
        rating: 4.8,
        reviewCount: 0,
        isVerified: true,
        isFeatured: true,
        isPremium: false,
        status: 'active',
      },
    }),
    prisma.school.create({
      data: {
        id: 'sch-4',
        name: 'Makerere University',
        slug: 'makerere-university',
        type: 'university',
        category: 'mixed',
        gender: 'mixed',
        description: 'Makerere-affiliated learning hub offering undergraduate and postgraduate programs across multiple disciplines. Our research-driven approach, combined with industry partnerships, ensures graduates are well-prepared for the global job market. The campus features modern lecture halls, research centers, and extensive student amenities.',
        shortDescription: 'A leading university with research-driven programs and strong industry partnerships.',
        logo,
        coverImage: schoolImages[3],
        gallery: JSON.stringify([schoolImages[3], schoolImages[1], schoolImages[5]]),
        address: 'University Road, Makerere Hill',
        city: 'Kampala',
        region: 'Central Region',
        country: 'Uganda',
        latitude: 0.3340,
        longitude: 32.5677,
        phone: '+256 733 456 789',
        email: 'admissions@makerere.ac.ug',
        website: 'https://makerere.ac.ug',
        whatsapp: '+256733456789',
        currency: 'UGX',
        dayMin: 2000000,
        dayMax: 5000000,
        boardingMin: 3500000,
        boardingMax: 7000000,
        facilities: JSON.stringify(['Library', 'Science Labs', 'Computer Lab', 'Sports Field', 'Swimming Pool', 'Dormitory', 'Cafeteria', 'Medical Center', 'WiFi', 'Security', 'Art Studio']),
        rating: 4.3,
        reviewCount: 0,
        isVerified: true,
        isFeatured: false,
        isPremium: true,
        status: 'active',
      },
    }),
    prisma.school.create({
      data: {
        id: 'sch-5',
        name: 'Sunshine Daycare Center',
        slug: 'sunshine-daycare',
        type: 'daycare',
        category: 'day',
        gender: 'mixed',
        description: 'Sunshine Daycare Center provides safe, loving care for infants and toddlers while their parents work. Our trained caregivers follow a structured daily routine that includes age-appropriate activities, nutritious meals, and plenty of rest time. We believe every child deserves a bright start, and our center is designed to be a home away from home.',
        shortDescription: 'Safe, loving daycare with structured activities and nutritious meals for your little ones.',
        logo,
        coverImage: schoolImages[4],
        gallery: JSON.stringify([schoolImages[4], schoolImages[2], schoolImages[0]]),
        address: '23 Acacia Avenue',
        city: 'Kampala',
        region: 'Central Region',
        country: 'Uganda',
        latitude: 0.3163,
        longitude: 32.6014,
        phone: '+256 744 567 890',
        email: 'care@sunshinedaycare.ug',
        whatsapp: '+256744567890',
        currency: 'UGX',
        dayMin: 300000,
        dayMax: 600000,
        facilities: JSON.stringify(['Playground', 'Cafeteria', 'Security', 'Medical Center']),
        rating: 4.6,
        reviewCount: 0,
        isVerified: false,
        isFeatured: false,
        isPremium: false,
        status: 'active',
      },
    }),
    prisma.school.create({
      data: {
        id: 'sch-6',
        name: 'Naalya International School',
        slug: 'naalya-international',
        type: 'secondary',
        category: 'mixed',
        gender: 'girls_only',
        description: 'Naalya International School offers the Cambridge International Curriculum, providing students with globally recognized qualifications. Our diverse student body and international faculty create a multicultural learning experience. With a focus on holistic education, we develop well-rounded individuals prepared for university success worldwide.',
        shortDescription: 'Cambridge curriculum school developing globally competitive, well-rounded individuals.',
        logo,
        coverImage: schoolImages[5],
        gallery: JSON.stringify([schoolImages[5], schoolImages[3], schoolImages[1]]),
        address: '15 Naalya Estate Road',
        city: 'Wakiso',
        region: 'Central Region',
        country: 'Uganda',
        latitude: 0.3700,
        longitude: 32.6600,
        phone: '+256 755 678 901',
        email: 'info@naalyainternational.ac.ug',
        website: 'https://naalyainternational.ac.ug',
        whatsapp: '+256755678901',
        currency: 'UGX',
        dayMin: 3000000,
        dayMax: 6000000,
        boardingMin: 5000000,
        boardingMax: 8000000,
        facilities: JSON.stringify(['Transport', 'Library', 'Science Labs', 'Computer Lab', 'Sports Field', 'Swimming Pool', 'Dormitory', 'Cafeteria', 'Art Studio', 'Music Room', 'Medical Center', 'WiFi', 'Security']),
        rating: 4.9,
        reviewCount: 1,
        isVerified: true,
        isFeatured: true,
        isPremium: true,
        status: 'active',
      },
    }),
    prisma.school.create({
      data: {
        id: 'sch-7',
        name: 'Mbarara Primary Academy',
        slug: 'mbarara-primary',
        type: 'primary',
        category: 'day',
        gender: 'mixed',
        description: 'Mbarara Primary Academy is a modern, well-equipped school dedicated to providing quality primary education. Our teachers are passionate about fostering a love of learning in every child.',
        shortDescription: 'Modern primary school dedicated to fostering a love of learning in every child.',
        logo,
        coverImage: schoolImages[0],
        gallery: JSON.stringify([schoolImages[0], schoolImages[4]]),
        address: '7 High Street',
        city: 'Mbarara',
        region: 'Western Region',
        country: 'Uganda',
        latitude: -0.6113,
        longitude: 30.6586,
        phone: '+256 766 789 012',
        email: 'info@mbararaprimary.ac.ug',
        whatsapp: '+256766789012',
        currency: 'UGX',
        dayMin: 500000,
        dayMax: 900000,
        facilities: JSON.stringify(['Library', 'Computer Lab', 'Sports Field', 'Playground', 'Cafeteria', 'Security']),
        rating: 4.2,
        reviewCount: 0,
        isVerified: true,
        isFeatured: false,
        isPremium: false,
        status: 'active',
      },
    }),
    prisma.school.create({
      data: {
        id: 'sch-8',
        name: 'Gulu Progressive Academy',
        slug: 'gulu-progressive-academy',
        type: 'secondary',
        category: 'day',
        gender: 'mixed',
        description: 'Gulu Progressive Academy offers an exceptional secondary education experience in Northern Uganda. Known for strong STEM programs and a vibrant extracurricular scene.',
        shortDescription: 'Exceptional secondary education with strong STEM programs in Northern Uganda.',
        logo,
        coverImage: schoolImages[1],
        gallery: JSON.stringify([schoolImages[1], schoolImages[5]]),
        address: '32 Gulu-Kampala Highway',
        city: 'Gulu',
        region: 'Northern Region',
        country: 'Uganda',
        latitude: 2.7746,
        longitude: 32.2990,
        phone: '+256 777 890 123',
        email: 'enroll@guluprogressive.ac.ug',
        website: 'https://guluprogressive.ac.ug',
        currency: 'UGX',
        dayMin: 700000,
        dayMax: 1200000,
        facilities: JSON.stringify(['Transport', 'Library', 'Science Labs', 'Computer Lab', 'Sports Field', 'Cafeteria', 'WiFi', 'Security']),
        rating: 4.4,
        reviewCount: 0,
        isVerified: true,
        isFeatured: false,
        isPremium: true,
        status: 'active',
      },
    }),
  ]);

  // Create reviews
  await prisma.review.createMany({
    data: [
      {
        schoolId: 'sch-1',
        userId: 'u1',
        userName: 'Sarah Namukasa',
        rating: 5,
        title: 'Excellent school for my children',
        content: 'My two kids have been attending Kampala Junior Academy for 3 years now and the improvement in their academics and social skills is remarkable. The teachers are dedicated and the facilities are top-notch.',
      },
      {
        schoolId: 'sch-1',
        userId: 'u2',
        userName: 'James Okello',
        rating: 4,
        title: 'Great environment, good teachers',
        content: 'The learning environment is excellent and my daughter loves going to school every day. The fees are a bit on the higher side but worth it for the quality of education provided.',
      },
      {
        schoolId: 'sch-1',
        userId: 'u3',
        userName: 'Mary Achieng',
        rating: 5,
        title: 'Highly recommended!',
        content: 'The school has wonderful facilities and the staff is very caring. My son has grown so much since joining. The transport service is also very reliable.',
      },
      {
        schoolId: 'sch-2',
        userId: 'u1',
        userName: 'Sarah Namukasa',
        rating: 4,
        title: 'Solid boarding school',
        content: 'My eldest son boards here and I am impressed with the discipline and academic standards. The campus is beautiful and well-maintained.',
      },
      {
        schoolId: 'sch-6',
        userId: 'u4',
        userName: 'Peter Kato',
        rating: 5,
        title: 'World-class education in Uganda',
        content: 'Naalya International is truly world-class. The Cambridge curriculum prepares students exceptionally well. My daughter got accepted into a top UK university directly from here.',
      },
    ],
  });

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
        schoolId: 'sch-6',
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
        message: 'Please share boarding requirements and fee structure.',
        status: 'contacted',
      },
      {
        schoolId: 'sch-6',
        name: 'Mariam Atuhaire',
        email: 'mariam@example.com',
        phone: '+256703555666',
        message: 'Do you offer scholarships for international curriculum students?',
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
