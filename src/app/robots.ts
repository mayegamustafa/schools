import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site-url';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Nothing behind auth is useful in an index, and crawling them just
        // burns crawl budget on redirects.
        disallow: ['/api/', '/admin', '/dashboard', '/auth/', '/messages'],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
