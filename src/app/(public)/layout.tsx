import { prisma } from '@/lib/prisma';
import { DEFAULT_SITE_CONTENT } from '@/lib/site-defaults';
import type { SiteContent } from '@/lib/site-defaults';
import { SiteContentProvider } from '@/context/SiteContentContext';

const SITE_CONTENT_TITLE = 'site_content';
import PublicNavbar from '@/components/public/PublicNavbar';
import PublicFooter from '@/components/public/PublicFooter';

async function getSiteContent(): Promise<SiteContent> {
  try {
    const section = await prisma.cmsSection.findFirst({ where: { title: SITE_CONTENT_TITLE } });
    if (section) {
      const parsed = JSON.parse(section.content);
      return { ...DEFAULT_SITE_CONTENT, ...parsed } as SiteContent;
    }
  } catch { /* fall through */ }
  return DEFAULT_SITE_CONTENT as SiteContent;
}

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const siteContent = await getSiteContent();
  return (
    <SiteContentProvider initialData={siteContent}>
      <PublicNavbar />
      <main className="flex-1 pt-16">{children}</main>
      <PublicFooter />
    </SiteContentProvider>
  );
}
