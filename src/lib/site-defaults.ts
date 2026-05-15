// Site-wide defaults — pure data, no Node.js / Prisma dependencies.
// Safe to import in both Server Components and Client Components.

// ── Color utilities ──────────────────────────────────────────────────────────

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h: number, s: number, l: number): string {
  const hh = h / 360, ss = s / 100, ll = l / 100;
  const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
  const p = 2 * ll - q;
  const hue2rgb = (t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const to = (x: number) => Math.round(hue2rgb(x) * 255).toString(16).padStart(2, '0');
  return `#${to(hh + 1 / 3)}${to(hh)}${to(hh - 1 / 3)}`;
}

/** Given a base hex color, returns { base, light, dark } hex strings. */
export function deriveColorVars(hex: string): { base: string; light: string; dark: string } {
  if (!hex || !hex.startsWith('#') || hex.length !== 7) return { base: hex, light: hex, dark: hex };
  const [h, s, l] = hexToHsl(hex);
  return {
    base: hex,
    light: hslToHex(h, Math.max(s - 5, 0), Math.min(l + 20, 95)),
    dark: hslToHex(h, Math.min(s + 5, 100), Math.max(l - 10, 5)),
  };
}

// ── Color presets ─────────────────────────────────────────────────────────────

export interface ColorPreset {
  name: string;
  primaryColor: string;
  accentColor: string;
  successColor: string;
  errorColor: string;
}

export const COLOR_PRESETS: ColorPreset[] = [
  { name: 'Default',  primaryColor: '#2d3640', accentColor: '#8b7355', successColor: '#446c56', errorColor: '#904545' },
  { name: 'Ocean',    primaryColor: '#1a4a6b', accentColor: '#3a8fbf', successColor: '#2a6b5f', errorColor: '#8b3a3a' },
  { name: 'Forest',   primaryColor: '#2d4a2d', accentColor: '#6b8f4a', successColor: '#3a6b3a', errorColor: '#8b4040' },
  { name: 'Slate',    primaryColor: '#3a4a5c', accentColor: '#6b7f8f', successColor: '#3a6b5f', errorColor: '#7f4040' },
  { name: 'Amber',    primaryColor: '#5c3a1a', accentColor: '#c47f2a', successColor: '#4a6b3a', errorColor: '#8b3030' },
  { name: 'Indigo',   primaryColor: '#2a2a6b', accentColor: '#5a5abf', successColor: '#3a6b5a', errorColor: '#8b3a5a' },
  { name: 'Rose',     primaryColor: '#5c2a3a', accentColor: '#bf5a7a', successColor: '#3a6b5a', errorColor: '#8b2a2a' },
  { name: 'Obsidian', primaryColor: '#1a1a1a', accentColor: '#6b6b6b', successColor: '#3a6b56', errorColor: '#904545' },
];

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
