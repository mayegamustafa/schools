export function formatCurrency(amount: number, currency: string = 'UGX'): string {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function getSchoolTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    kindergarten: 'Kindergarten',
    primary: 'Primary School',
    secondary: 'Secondary School',
    secondary_o: 'Secondary (O Level)',
    secondary_oa: 'Secondary (O & A Level)',
    university: 'University',
    daycare: 'Daycare',
  };
  return labels[type] || type;
}

export function getSchoolCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    day: 'Day School',
    boarding: 'Boarding School',
    mixed: 'Day & Boarding',
  };
  return labels[category] || category;
}

export function getSchoolGenderLabel(gender: string): string {
  const labels: Record<string, string> = {
    mixed: 'Mixed (Boys & Girls)',
    girls_only: 'Girls Only',
    boys_only: 'Boys Only',
  };
  return labels[gender] || 'Mixed (Boys & Girls)';
}

export function getSchoolTypeColor(type: string): string {
  const colors: Record<string, string> = {
    kindergarten: 'bg-accent/10 text-accent-dark',
    primary: 'bg-primary/10 text-primary',
    secondary: 'bg-secondary/10 text-secondary',
    university: 'bg-hover text-text-secondary',
    daycare: 'bg-success/10 text-success',
  };
  return colors[type] || 'bg-hover text-text-secondary';
}

export function generateStars(rating: number): { full: number; half: boolean; empty: number } {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return { full, half, empty };
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export const FALLBACK_COVER_IMAGE = '/students-working-laptop-school.jpg';
export const FALLBACK_LOGO_IMAGE = '/file.svg';

export function sanitizeImageSrc(
  src: string | null | undefined,
  fallback: string = FALLBACK_COVER_IMAGE
): string {
  if (typeof src !== 'string') return fallback;
  const trimmed = src.trim();
  return trimmed || fallback;
}
