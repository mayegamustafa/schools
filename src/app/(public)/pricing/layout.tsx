import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing — Plans for Schools',
  description:
    'Simple plans for schools listing on SchoolFinder. Compare features and choose the '
    + 'visibility that fits your admissions goals.',
  alternates: { canonical: '/pricing' },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
