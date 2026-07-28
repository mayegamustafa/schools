import type { MetadataRoute } from 'next';
import { getActiveSchoolSlugs, getActiveCities } from '@/lib/schools';
import { siteUrl } from '@/lib/site-url';
import { SELECTABLE_SCHOOL_TYPES } from '@/lib/taxonomy';
import { slugify } from '@/lib/serialize';

export const revalidate = 3600;

/**
 * Without a sitemap, Google had to discover every school by crawling a
 * client-rendered listing page. This publishes every active listing plus the
 * city and level landing pages that match how parents actually search.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/schools`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/schools/register`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/pricing`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/compare`, changeFrequency: 'monthly', priority: 0.4 },
  ];

  try {
    const [schools, cities] = await Promise.all([
      getActiveSchoolSlugs(),
      getActiveCities(),
    ]);

    const schoolRoutes: MetadataRoute.Sitemap = schools.map(school => ({
      url: `${base}/schools/${school.slug}`,
      lastModified: school.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    const cityRoutes: MetadataRoute.Sitemap = cities.map(city => ({
      url: `${base}/schools/in/${slugify(city)}`,
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    const levelRoutes: MetadataRoute.Sitemap = SELECTABLE_SCHOOL_TYPES.map(type => ({
      url: `${base}/schools?type=${type}`,
      changeFrequency: 'weekly',
      priority: 0.6,
    }));

    return [...staticRoutes, ...schoolRoutes, ...cityRoutes, ...levelRoutes];
  } catch {
    // A database hiccup shouldn't make the whole sitemap 500 — serve what we can.
    return staticRoutes;
  }
}
