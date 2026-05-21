import PublicNavbar from '@/components/public/PublicNavbar';
import PublicFooter from '@/components/public/PublicFooter';
import AppInstallBanner from '@/components/public/AppInstallBanner';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppInstallBanner />
      <PublicNavbar />
      <main className="flex-1 pt-16">{children}</main>
      <PublicFooter />
    </>
  );
}
