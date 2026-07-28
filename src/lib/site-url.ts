/**
 * Absolute site origin, used for canonical URLs, Open Graph tags, the sitemap,
 * and JSON-LD — all of which must be absolute to be valid.
 *
 * Set NEXT_PUBLIC_SITE_URL in production. Railway also exposes its own public
 * domain, which is used as a fallback so deploys are correct out of the box.
 */
export function siteUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : '');

  return (configured || 'http://localhost:3000').replace(/\/+$/, '');
}
