import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import Toast from "@/components/ui/Toast";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "SchoolFinder — Discover & Compare the Best Schools",
  description: "Find, compare, and connect with top-rated schools near you. Kindergartens, primary schools, secondary schools, and universities — all in one trusted platform.",
  manifest: "/manifest.json",
  icons: { apple: "/icon-192.png" },
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
    const vars = [
      b.primaryColor && `--color-primary:${b.primaryColor}`,
      b.accentColor  && `--color-accent:${b.accentColor}`,
      b.successColor && `--color-success:${b.successColor}`,
      b.errorColor   && `--color-error:${b.errorColor}`,
    ].filter(Boolean).join(';');
    return vars ? `:root{${vars}}` : '';
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
      <head>
        {brandStyle && <style dangerouslySetInnerHTML={{ __html: brandStyle }} />}
      </head>
      <body className="min-h-full flex flex-col antialiased">
        <AppProvider>
          {children}
          <Toast />
        </AppProvider>
      </body>
    </html>
  );
}
