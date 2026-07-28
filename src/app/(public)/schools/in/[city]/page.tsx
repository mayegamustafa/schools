import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import SchoolCard from '@/components/schools/SchoolCard';
import SearchBar from '@/components/schools/SearchBar';
import { prisma } from '@/lib/prisma';
import { serializeSchool, slugify } from '@/lib/serialize';
import { getActiveCities } from '@/lib/schools';
import { siteUrl } from '@/lib/site-url';
import { formatCurrency } from '@/utils/helpers';

interface PageProps {
  params: Promise<{ city: string }>;
}

export const revalidate = 3600;

/**
 * City landing page — "/schools/in/kampala".
 *
 * These target the queries that actually carry volume ("primary schools in
 * Kampala"), which a single client-rendered /schools route could never rank for.
 * Server-rendered so the listings are in the HTML.
 */
async function loadCity(citySlug: string) {
  // The slug is derived, not stored, so resolve it against the real city names.
  const cities = await getActiveCities();
  const city = cities.find(name => slugify(name) === citySlug);
  if (!city) return null;

  const schools = await prisma.school.findMany({
    where: { status: 'active', city: { equals: city, mode: 'insensitive' } },
    orderBy: [{ isFeatured: 'desc' }, { rating: 'desc' }],
    take: 48,
  });

  return { city, schools: schools.map(serializeSchool) };
}

export async function generateStaticParams() {
  try {
    const cities = await getActiveCities();
    return cities.map(city => ({ city: slugify(city) }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city: citySlug } = await params;
  const data = await loadCity(citySlug);

  if (!data) return { title: 'City not found — SchoolFinder' };

  const title = `Schools in ${data.city} — Compare ${data.schools.length} Schools & Fees`;
  const description =
    `Browse ${data.schools.length} schools in ${data.city}. Compare fees, facilities, `
    + 'ratings, and parent reviews, then contact admissions directly on SchoolFinder.';

  return {
    title,
    description,
    alternates: { canonical: `${siteUrl()}/schools/in/${citySlug}` },
    openGraph: { title, description, url: `${siteUrl()}/schools/in/${citySlug}`, siteName: 'SchoolFinder' },
  };
}

export default async function CitySchoolsPage({ params }: PageProps) {
  const { city: citySlug } = await params;
  const data = await loadCity(citySlug);

  if (!data) notFound();

  const { city, schools } = data;
  const withFees = schools.filter(s => s.fees.dayMin > 0);
  const lowestFee = withFees.length
    ? Math.min(...withFees.map(s => s.fees.dayMin))
    : 0;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Schools in ${city}`,
    numberOfItems: schools.length,
    itemListElement: schools.slice(0, 25).map((school, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${siteUrl()}/schools/${school.slug}`,
      name: school.name,
    })),
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="text-sm text-text-secondary mb-4">
        <Link href="/" className="hover:text-text-primary">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/schools" className="hover:text-text-primary">Schools</Link>
        <span className="mx-2">/</span>
        <span className="text-text-primary font-medium">{city}</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-3">
          Schools in {city}
        </h1>
        <p className="text-text-secondary max-w-2xl">
          {schools.length} school{schools.length === 1 ? '' : 's'} listed in {city}
          {lowestFee > 0 && <> — fees from {formatCurrency(lowestFee)} per term</>}.
          Compare facilities, fees, and parent reviews, then contact admissions directly.
        </p>
      </header>

      <div className="mb-8">
        <SearchBar initialQuery={city} className="max-w-3xl" />
      </div>

      {schools.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {schools.map(school => (
            <SchoolCard key={school.id} school={school} />
          ))}
        </div>
      ) : (
        <p className="text-text-secondary">No schools listed in {city} yet.</p>
      )}

      <div className="mt-12 pt-8 border-t border-border">
        <Link href="/schools" className="text-primary font-medium hover:text-primary-dark">
          Browse all schools →
        </Link>
      </div>
    </div>
  );
}
