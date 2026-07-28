import type { Metadata } from 'next';

/**
 * The listing page is a client component (it drives filters from local state),
 * so its metadata lives here — a layout can export metadata where a 'use client'
 * page cannot.
 */
export const metadata: Metadata = {
  title: 'Browse Schools — Fees, Facilities & Reviews',
  description:
    'Search and filter schools across Uganda by level, city, fees, facilities, and rating. '
    + 'Compare listings side by side and contact admissions directly.',
  alternates: { canonical: '/schools' },
};

export default function SchoolsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
