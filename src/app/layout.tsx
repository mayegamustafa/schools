import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import Toast from "@/components/ui/Toast";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col antialiased">
        <AppProvider>
          {children}
          <Toast />
        </AppProvider>
      </body>
    </html>
  );
}
