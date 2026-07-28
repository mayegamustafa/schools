import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { getSchoolTypeLabel } from '@/utils/helpers';

export interface SchoolSuggestion {
  kind: 'school';
  id: string;
  slug: string;
  name: string;
  city: string;
  region: string;
  typeLabel: string;
  logo: string;
  rating: number;
  reviewCount: number;
}

export interface PlaceSuggestion {
  kind: 'place';
  /** "Kampala" or "Kampala, Central Region" */
  label: string;
  city: string;
  region: string;
  schoolCount: number;
}

/**
 * Typeahead endpoint for the search bar.
 *
 * Separate from /api/schools because that endpoint runs the full filter,
 * pagination and serialisation pipeline — far too much work to run on every
 * keystroke. This selects only the handful of columns the dropdown renders.
 */
export async function GET(request: Request) {
  const limit = rateLimit(request, 'suggest', { limit: 120, windowMs: 60 * 1000 });
  if (!limit.ok) return rateLimitResponse(limit);

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') || '').trim();

  if (query.length < 2) {
    return NextResponse.json({ schools: [], places: [] });
  }

  const match = { contains: query, mode: 'insensitive' as const };

  const rows = await prisma.school.findMany({
    where: {
      status: 'active',
      OR: [
        { name: match },
        { city: match },
        { region: match },
        { address: match },
      ],
    },
    select: {
      id: true,
      slug: true,
      name: true,
      city: true,
      region: true,
      type: true,
      types: true,
      logo: true,
      rating: true,
      reviewCount: true,
      isFeatured: true,
    },
    // Featured and better-rated schools surface first in the dropdown.
    orderBy: [{ isFeatured: 'desc' }, { rating: 'desc' }],
    take: 40,
  });

  const lowered = query.toLowerCase();

  const schools: SchoolSuggestion[] = rows
    .filter(row => row.name.toLowerCase().includes(lowered))
    .slice(0, 6)
    .map(row => ({
      kind: 'school',
      id: row.id,
      slug: row.slug,
      name: row.name,
      city: row.city,
      region: row.region,
      typeLabel: getSchoolTypeLabel(row.types[0] || row.type),
      logo: row.logo,
      rating: row.rating,
      reviewCount: row.reviewCount,
    }));

  // Roll matching rows up into place suggestions, so typing "kam" offers
  // "Kampala — 24 schools" alongside individual school names.
  const places = new Map<string, PlaceSuggestion>();
  for (const row of rows) {
    if (!row.city) continue;
    if (!row.city.toLowerCase().includes(lowered) && !row.region.toLowerCase().includes(lowered)) {
      continue;
    }

    const key = `${row.city}|${row.region}`.toLowerCase();
    const existing = places.get(key);
    if (existing) {
      existing.schoolCount += 1;
    } else {
      places.set(key, {
        kind: 'place',
        label: row.region ? `${row.city}, ${row.region}` : row.city,
        city: row.city,
        region: row.region,
        schoolCount: 1,
      });
    }
  }

  return NextResponse.json({
    schools,
    places: [...places.values()]
      .sort((a, b) => b.schoolCount - a.schoolCount)
      .slice(0, 4),
  });
}
