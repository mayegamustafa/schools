import { School, Review } from '@/types';
import type { School as DbSchool, Review as DbReview } from '@/generated/prisma/client';

const FALLBACK_COVER_IMAGE = '/students-working-laptop-school.jpg';
const FALLBACK_LOGO_IMAGE = '/file.svg';

function toNonEmptyString(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function parseStringArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(item => toNonEmptyString(item))
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function serializeSchool(s: DbSchool): School {
  const coverImage = toNonEmptyString(s.coverImage) || FALLBACK_COVER_IMAGE;
  const logo = toNonEmptyString(s.logo) || FALLBACK_LOGO_IMAGE;
  const gallery = parseStringArray(s.gallery);
  const videos = parseStringArray(s.videos);

  return {
    id: s.id,
    name: s.name,
    slug: s.slug,
    type: s.type as School['type'],
    category: s.category as School['category'],
    gender: (s.gender as School['gender']) || 'mixed',
    description: s.description,
    shortDescription: s.shortDescription,
    logo,
    coverImage,
    gallery: gallery.length > 0 ? gallery : [coverImage],
    videos,
    location: {
      address: s.address,
      city: s.city,
      region: s.region,
      country: s.country,
      latitude: s.latitude,
      longitude: s.longitude,
    },
    contact: {
      phone: s.phone,
      email: s.email,
      website: s.website ?? undefined,
      whatsapp: s.whatsapp ?? undefined,
    },
    fees: {
      currency: s.currency,
      dayMin: s.dayMin,
      dayMax: s.dayMax,
      boardingMin: s.boardingMin ?? undefined,
      boardingMax: s.boardingMax ?? undefined,
    },
    facilities: parseStringArray(s.facilities),
    rating: s.rating,
    reviewCount: s.reviewCount,
    isVerified: s.isVerified,
    isFeatured: s.isFeatured,
    isPremium: s.isPremium,
    status: s.status as School['status'],
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

export function serializeReview(r: DbReview): Review {
  const avatar = toNonEmptyString(r.userAvatar);

  return {
    id: r.id,
    schoolId: r.schoolId,
    userId: r.userId,
    userName: r.userName,
    userAvatar: avatar || undefined,
    rating: r.rating,
    title: r.title,
    content: r.content,
    createdAt: r.createdAt.toISOString(),
  };
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
