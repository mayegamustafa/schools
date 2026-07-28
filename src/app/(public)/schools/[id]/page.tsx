import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SchoolProfileClient from './SchoolProfileClient';
import ViewTracker from '@/components/schools/ViewTracker';
import { getSchoolByIdOrSlug } from '@/lib/schools';
import { getSchoolTypesLabel, getSchoolCategoryLabel, formatCurrency } from '@/utils/helpers';
import { siteUrl } from '@/lib/site-url';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Per-school metadata.
 *
 * Every listing previously shared the site-wide title and description, because
 * the page was a client component that fetched itself after hydration. For a
 * directory whose traffic comes from searches like "day primary schools in
 * Kampala", that was the single biggest thing holding the site back.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getSchoolByIdOrSlug(id);

  if (!data) {
    return { title: 'School not found — SchoolFinder' };
  }

  const { school } = data;
  const levels = getSchoolTypesLabel(school.types, school.type);
  const title = `${school.name} — ${levels} in ${school.location.city}`;

  const feeText = school.fees.dayMin > 0
    ? ` Fees from ${formatCurrency(school.fees.dayMin, school.fees.currency)} per term.`
    : '';
  const ratingText = school.reviewCount > 0
    ? ` Rated ${school.rating.toFixed(1)}/5 from ${school.reviewCount} parent review${school.reviewCount === 1 ? '' : 's'}.`
    : '';

  const description =
    `${school.name} is a ${getSchoolCategoryLabel(school.category).toLowerCase()} in `
    + `${school.location.city}, ${school.location.region}.${feeText}${ratingText} `
    + 'View facilities, fees, photos, and contact details on SchoolFinder.';

  const canonical = `${siteUrl()}/schools/${school.slug}`;

  return {
    title,
    description: description.slice(0, 300),
    alternates: { canonical },
    openGraph: {
      title,
      description: description.slice(0, 300),
      url: canonical,
      type: 'profile',
      siteName: 'SchoolFinder',
      images: school.coverImage ? [{ url: school.coverImage, alt: school.name }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: description.slice(0, 200),
      images: school.coverImage ? [school.coverImage] : undefined,
    },
  };
}

export default async function SchoolProfilePage({ params }: PageProps) {
  const { id } = await params;
  const data = await getSchoolByIdOrSlug(id);

  if (!data) notFound();

  const { school, reviews } = data;

  // Structured data. AggregateRating is only emitted when real reviews exist —
  // Google penalises rating markup with nothing behind it.
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'School',
    name: school.name,
    description: school.shortDescription || school.description.slice(0, 300),
    url: `${siteUrl()}/schools/${school.slug}`,
    image: school.coverImage || undefined,
    logo: school.logo || undefined,
    telephone: school.contact.phone,
    email: school.contact.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: school.location.address,
      addressLocality: school.location.city,
      addressRegion: school.location.region,
      addressCountry: school.location.country,
    },
  };

  if (school.location.latitude !== 0 || school.location.longitude !== 0) {
    jsonLd.geo = {
      '@type': 'GeoCoordinates',
      latitude: school.location.latitude,
      longitude: school.location.longitude,
    };
  }

  if (school.reviewCount > 0) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: school.rating,
      reviewCount: school.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ViewTracker schoolId={school.id} />
      <SchoolProfileClient school={school} initialReviews={reviews} />
    </>
  );
}
