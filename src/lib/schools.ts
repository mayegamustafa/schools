import { prisma } from '@/lib/prisma';
import { serializeSchool, serializeReview } from '@/lib/serialize';
import type { School, Review } from '@/types';

/**
 * Server-side school lookup used by the school profile page.
 *
 * The page used to be a client component that fetched itself over HTTP after
 * hydration, which meant crawlers saw an empty shell and every listing shared
 * one generic <title>. Reading from the database during the server render lets
 * the page ship real content and per-school metadata.
 */
export async function getSchoolByIdOrSlug(
  idOrSlug: string
): Promise<{ school: School; reviews: Review[] } | null> {
  const record = await prisma.school.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    include: {
      reviews: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!record) return null;

  return {
    school: serializeSchool(record),
    reviews: record.reviews.map(serializeReview),
  };
}

/** Slugs for the sitemap. Only active listings should be advertised to crawlers. */
export async function getActiveSchoolSlugs(): Promise<
  Array<{ slug: string; updatedAt: Date }>
> {
  return prisma.school.findMany({
    where: { status: 'active' },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
  });
}

/** Distinct cities with active listings — drives the city landing pages. */
export async function getActiveCities(): Promise<string[]> {
  const rows = await prisma.school.findMany({
    where: { status: 'active' },
    select: { city: true },
    distinct: ['city'],
  });

  return rows.map(r => r.city).filter(Boolean).sort((a, b) => a.localeCompare(b));
}
