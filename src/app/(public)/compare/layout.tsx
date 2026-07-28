import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Compare Schools Side by Side',
  description:
    'Line up to four schools side by side and compare fees, facilities, ratings, and '
    + 'programmes in one clear view.',
  alternates: { canonical: '/compare' },
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
