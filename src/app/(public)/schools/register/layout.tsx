import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'List Your School — Reach Thousands of Parents',
  description:
    'Register your school on SchoolFinder for free. Add your badge, photos, fees, and '
    + 'facilities, and start receiving admission enquiries from parents searching in your area.',
  alternates: { canonical: '/schools/register' },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
