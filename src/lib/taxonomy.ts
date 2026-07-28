/**
 * Single source of truth for school classification values.
 *
 * These lists were previously duplicated across the register form, the schools
 * API, the schools/[id] API and the admin console — and drifted apart, which is
 * how comma-joined types ended up being rejected by the very endpoint the form
 * posts to. Everything now validates against this module.
 */

export const SCHOOL_TYPES = [
  'daycare',
  'kindergarten',
  'primary',
  'secondary',
  'secondary_o',
  'secondary_oa',
  'tertiary',
  'university',
] as const;

export type SchoolTypeValue = (typeof SCHOOL_TYPES)[number];

export const SCHOOL_CATEGORIES = ['day', 'boarding', 'mixed'] as const;
export const SCHOOL_GENDERS = ['mixed', 'girls_only', 'boys_only'] as const;
export const SCHOOL_STATUSES = ['active', 'pending', 'rejected', 'suspended'] as const;

/** Levels the register form offers. Secondary expands into its O / O&A variants. */
export const SELECTABLE_SCHOOL_TYPES = [
  'daycare',
  'kindergarten',
  'primary',
  'secondary',
  'tertiary',
  'university',
] as const;

/**
 * Browse tiles and filter chips use the family name ("secondary"), but rows are
 * stored with the level actually offered ("secondary_oa"). Expanding the filter
 * keeps `/schools?type=secondary` matching every secondary school — previously
 * it matched none of them.
 */
const TYPE_FAMILIES: Record<string, readonly string[]> = {
  secondary: ['secondary', 'secondary_o', 'secondary_oa'],
};

export function expandTypeFilter(type: string): string[] {
  return [...(TYPE_FAMILIES[type] ?? [type])];
}

/** Collapses a stored type back to the family used for grouping and tiles. */
export function typeFamily(type: string): string {
  return type.startsWith('secondary') ? 'secondary' : type;
}

export function isValidSchoolType(value: unknown): value is SchoolTypeValue {
  return typeof value === 'string' && (SCHOOL_TYPES as readonly string[]).includes(value);
}

/**
 * Accepts what any client might send — an array, a single value, or the legacy
 * comma-joined string the register form used to build — and returns a clean,
 * deduplicated list of valid types. Invalid entries are dropped rather than
 * failing the whole request; an empty result means "nothing usable was sent".
 */
export function normalizeSchoolTypes(input: unknown): SchoolTypeValue[] {
  const raw: unknown[] = Array.isArray(input)
    ? input
    : typeof input === 'string'
      ? input.split(',')
      : [];

  const seen = new Set<SchoolTypeValue>();
  for (const entry of raw) {
    const value = typeof entry === 'string' ? entry.trim() : '';
    if (isValidSchoolType(value)) seen.add(value);
  }

  return [...seen];
}

export function isValidCategory(value: unknown): boolean {
  return typeof value === 'string' && (SCHOOL_CATEGORIES as readonly string[]).includes(value);
}

export function normalizeGender(value: unknown): string {
  return typeof value === 'string' && (SCHOOL_GENDERS as readonly string[]).includes(value)
    ? value
    : 'mixed';
}

export function isValidStatus(value: unknown): boolean {
  return typeof value === 'string' && (SCHOOL_STATUSES as readonly string[]).includes(value);
}

/**
 * Filter options are derived from live listings, which means an empty database
 * leaves the register form with nothing to select. These are the fallbacks so
 * the very first school can always be registered.
 */
export const DEFAULT_CATEGORY_OPTIONS = [
  { value: 'day', label: 'Day School' },
  { value: 'boarding', label: 'Boarding School' },
  { value: 'mixed', label: 'Day & Boarding' },
] as const;

export const DEFAULT_GENDER_OPTIONS = [
  { value: 'mixed', label: 'Mixed (Boys & Girls)' },
  { value: 'girls_only', label: 'Girls Only' },
  { value: 'boys_only', label: 'Boys Only' },
] as const;

export const DEFAULT_FACILITIES = [
  'Library', 'Science Laboratory', 'Computer Lab', 'Sports Field', 'Swimming Pool',
  'School Bus', 'Dining Hall', 'Boarding Facilities', 'Music Room', 'Art Room',
  'Playground', 'Clinic', 'Wi-Fi', 'Security', 'Chapel / Prayer Room',
] as const;
