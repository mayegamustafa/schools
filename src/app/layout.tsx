import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import Toast from "@/components/ui/Toast";
import { prisma } from "@/lib/prisma";
import { deriveColorVars } from "@/lib/site-defaults";

export const metadata: Metadata = {
  title: "SchoolFinder — Discover & Compare the Best Schools",
  description: "Find, compare, and connect with top-rated schools near you. Kindergartens, primary schools, secondary schools, and universities — all in one trusted platform.",
  manifest: "/manifest.json",
  icons: { apple: "/icon-192.png" },
  // Native iOS Safari Smart App Banner — update app-id when the app is published
  other: { 'apple-itunes-app': 'app-id=000000000' },
};

export const viewport: Viewport = {
  themeColor: "#2d3640",
  width: "device-width",
  initialScale: 1,
};

async function getBrandStyle(): Promise<string> {
  try {
    const section = await prisma.cmsSection.findFirst({ where: { title: 'brand_settings' } });
    if (!section) return '';
    const b = JSON.parse(section.content) as Record<string, string>;

    const primary = deriveColorVars(b.primaryColor || '#2d3640');
    const accent  = deriveColorVars(b.accentColor  || '#8b7355');
    const success = deriveColorVars(b.successColor || '#446c56');
    const error   = deriveColorVars(b.errorColor   || '#904545');

    const vars = [
      `--color-primary:${primary.base}`,
      `--color-primary-light:${primary.light}`,
      `--color-primary-dark:${primary.dark}`,
      `--color-accent:${accent.base}`,
      `--color-accent-light:${accent.light}`,
      `--color-accent-dark:${accent.dark}`,
      `--color-success:${success.base}`,
      `--color-success-light:${success.light}`,
      `--color-error:${error.base}`,
    ].join(';');
    return `:root{${vars}}`;
  } catch {
    return '';
  }
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const brandStyle = await getBrandStyle();

  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col antialiased">
        <style dangerouslySetInnerHTML={{ __html: brandStyle }} />
        <AppProvider>
          {children}
          <Toast />
        </AppProvider>
      </body>
    </html>
  );
}
