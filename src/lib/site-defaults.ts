// Site-wide defaults — pure data, no Node.js / Prisma dependencies.
// Safe to import in both Server Components and Client Components.

export type NavLink = { label: string; href: string };
export type FooterLink = { label: string; href: string };
export type FooterColumn = { title: string; links: FooterLink[] };
export type HowItWorksStep = { title: string; desc: string };

export interface SiteContent {
  siteName: string;
  logoType: 'icon' | 'image';
  logoImageUrl: string;
  hero: {
    badge: string;
    title: string;
    description: string;
    imageUrl: string;
    imageCaption: string;
    popularTags: string[];
  };
  stats: {
    familiesValue: string;
    familiesLabel: string;
    citiesValue: string;
    citiesLabel: string;
    schoolsLabel: string;
    ratingLabel: string;
  };
  howItWorks: {
    title: string;
    subtitle: string;
    steps: HowItWorksStep[];
  };
  cta: {
    title: string;
    description: string;
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel: string;
    secondaryHref: string;
  };
  newsletter: {
    title: string;
    subtitle: string;
  };
  footer: {
    description: string;
    columns: FooterColumn[];
  };
  navLinks: NavLink[];
}

export const DEFAULT_SCHOOL_OPTIONS = {
  types: [
    { value: 'kindergarten', label: 'Kindergarten' },
    { value: 'primary', label: 'Primary School' },
    { value: 'secondary', label: 'Secondary School' },
    { value: 'university', label: 'University' },
    { value: 'daycare', label: 'Daycare' },
  ],
  categories: [
    { value: 'day', label: 'Day School' },
    { value: 'boarding', label: 'Boarding School' },
    { value: 'mixed', label: 'Day & Boarding' },
  ],
  genders: [
    { value: 'mixed', label: 'Mixed (Boys & Girls)' },
    { value: 'girls_only', label: 'Girls Only' },
    { value: 'boys_only', label: 'Boys Only' },
  ],
  facilities: [
    'Library', 'Computer Lab', 'Sports Field', 'Cafeteria',
    'Boarding House', 'Science Lab', 'Art Room', 'Music Room',
    'Swimming Pool', 'Chapel/Mosque',
  ],
};

export const DEFAULT_BRAND = {
  primaryColor: '#2d3640',
  accentColor: '#8b7355',
  successColor: '#446c56',
  errorColor: '#904545',
};

export const DEFAULT_SITE_CONTENT: SiteContent = {
  siteName: 'SchoolFinder',
  logoType: 'icon',
  logoImageUrl: '',
  hero: {
    badge: 'Trusted by families across Uganda',
    title: 'Find a school that truly fits your child.',
    description: 'Search verified school profiles, compare fees and facilities, and contact schools directly from one reliable platform.',
    imageUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&h=900&fit=crop&q=80',
    imageCaption: 'Updated today with new admissions and verified listings.',
    popularTags: ['Kampala', 'Boarding Schools', 'Primary Schools', 'International'],
  },
  stats: {
    familiesValue: '12K+',
    familiesLabel: 'Families',
    citiesValue: '50+',
    citiesLabel: 'Cities',
    schoolsLabel: 'Schools Listed',
    ratingLabel: 'Avg Rating',
  },
  howItWorks: {
    title: 'How it works',
    subtitle: 'A straightforward process from discovery to contact.',
    steps: [
      { title: 'Search', desc: 'Use location, school type, fees, and facilities to narrow your options quickly.' },
      { title: 'Compare', desc: 'Review schools side by side so you can make clear decisions with confidence.' },
      { title: 'Contact', desc: 'Reach schools directly through phone, email, or WhatsApp and plan your visit.' },
    ],
  },
  cta: {
    title: 'Run a school? Reach the right families.',
    description: 'Create your listing, keep your profile updated, and receive inquiries from parents actively searching.',
    primaryLabel: 'List Your School',
    primaryHref: '/schools/register',
    secondaryLabel: 'View Pricing',
    secondaryHref: '/pricing',
  },
  newsletter: {
    title: 'Get updates on new school listings',
    subtitle: 'No spam. Just useful admission windows and newly verified schools.',
  },
  footer: {
    description: 'A practical platform for families to discover, compare, and connect with schools across Uganda.',
    columns: [
      {
        title: 'Discover',
        links: [
          { label: 'Browse Schools', href: '/schools' },
          { label: 'Search', href: '/search' },
          { label: 'Compare Schools', href: '/compare' },
          { label: 'Top Rated', href: '/schools?sort=rating' },
        ],
      },
      {
        title: 'For Schools',
        links: [
          { label: 'List Your School', href: '/schools/register' },
          { label: 'Pricing', href: '/pricing' },
          { label: 'Dashboard', href: '/dashboard' },
        ],
      },
      {
        title: 'Company',
        links: [
          { label: 'About', href: '#' },
          { label: 'Contact', href: '#' },
          { label: 'Privacy', href: '#' },
          { label: 'Terms', href: '#' },
        ],
      },
    ],
  },
  navLinks: [
    { label: 'Home', href: '/' },
    { label: 'Search', href: '/search' },
    { label: 'Schools', href: '/schools' },
    { label: 'Compare', href: '/compare' },
    { label: 'Pricing', href: '/pricing' },
  ],
};
