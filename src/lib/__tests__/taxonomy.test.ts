import { describe, it, expect } from 'vitest';
import {
  normalizeSchoolTypes,
  expandTypeFilter,
  typeFamily,
  isValidSchoolType,
  isValidCategory,
  normalizeGender,
  isValidStatus,
  SCHOOL_TYPES,
  SCHOOL_CATEGORIES,
  SCHOOL_GENDERS,
  SELECTABLE_SCHOOL_TYPES,
  DEFAULT_CATEGORY_OPTIONS,
  DEFAULT_GENDER_OPTIONS,
  DEFAULT_FACILITIES,
} from '../taxonomy';

describe('normalizeSchoolTypes', () => {
  // The original blocking bug: the register form sent several levels joined by
  // commas and the API rejected the whole thing as one invalid type, so schools
  // offering both primary and secondary could not register at all.
  it('accepts an array of levels', () => {
    expect(normalizeSchoolTypes(['primary', 'secondary_oa'])).toEqual(['primary', 'secondary_oa']);
  });

  it('accepts the legacy comma-joined string', () => {
    expect(normalizeSchoolTypes('primary,secondary_oa')).toEqual(['primary', 'secondary_oa']);
  });

  it('accepts a single value', () => {
    expect(normalizeSchoolTypes('primary')).toEqual(['primary']);
  });

  it('deduplicates', () => {
    expect(normalizeSchoolTypes(['primary', 'primary', 'daycare'])).toEqual(['primary', 'daycare']);
  });

  it('drops invalid entries but keeps valid ones', () => {
    expect(normalizeSchoolTypes(['primary', 'wizardry'])).toEqual(['primary']);
  });

  it('returns empty when nothing is usable, so the caller can reject', () => {
    expect(normalizeSchoolTypes(['wizardry'])).toEqual([]);
    expect(normalizeSchoolTypes(undefined)).toEqual([]);
    expect(normalizeSchoolTypes(null)).toEqual([]);
    expect(normalizeSchoolTypes(42)).toEqual([]);
    expect(normalizeSchoolTypes({})).toEqual([]);
  });

  it('trims whitespace around values', () => {
    expect(normalizeSchoolTypes(' primary , daycare ')).toEqual(['primary', 'daycare']);
  });
});

describe('expandTypeFilter', () => {
  // Browse tiles link to ?type=secondary, but rows store secondary_o /
  // secondary_oa — without expansion that filter matched nothing.
  it('expands secondary to every variant', () => {
    expect(expandTypeFilter('secondary')).toEqual(['secondary', 'secondary_o', 'secondary_oa']);
  });

  it('leaves other levels untouched', () => {
    expect(expandTypeFilter('primary')).toEqual(['primary']);
    expect(expandTypeFilter('university')).toEqual(['university']);
  });

  it('returns a fresh array so callers cannot mutate the shared table', () => {
    const first = expandTypeFilter('secondary');
    first.push('tampered');
    expect(expandTypeFilter('secondary')).toEqual(['secondary', 'secondary_o', 'secondary_oa']);
  });
});

describe('typeFamily', () => {
  it('collapses secondary variants for grouping', () => {
    expect(typeFamily('secondary_o')).toBe('secondary');
    expect(typeFamily('secondary_oa')).toBe('secondary');
    expect(typeFamily('secondary')).toBe('secondary');
  });

  it('is identity for other levels', () => {
    expect(typeFamily('primary')).toBe('primary');
    expect(typeFamily('daycare')).toBe('daycare');
  });
});

describe('canonical option lists', () => {
  // The register form offers these directly. If one drops a value, a school of
  // that kind simply cannot list itself — which is how "Category" ended up
  // offering only "Day School" when the options were derived from live data.
  it('offers every category a school can be', () => {
    const offered = DEFAULT_CATEGORY_OPTIONS.map(o => o.value);
    for (const category of SCHOOL_CATEGORIES) {
      expect(offered, `no option for category "${category}"`).toContain(category);
    }
  });

  it('offers every gender mode a school can be', () => {
    const offered = DEFAULT_GENDER_OPTIONS.map(o => o.value);
    for (const gender of SCHOOL_GENDERS) {
      expect(offered, `no option for gender "${gender}"`).toContain(gender);
    }
  });

  it('gives every option a human label', () => {
    for (const option of [...DEFAULT_CATEGORY_OPTIONS, ...DEFAULT_GENDER_OPTIONS]) {
      expect(option.label.length).toBeGreaterThan(2);
      expect(option.label).not.toBe(option.value);
    }
  });

  it('offers a selectable level for every non-variant type', () => {
    // secondary_o / secondary_oa are chosen via the sub-option, not the top list.
    const selectable = new Set<string>(SELECTABLE_SCHOOL_TYPES);
    for (const type of SCHOOL_TYPES) {
      if (type.startsWith('secondary_')) continue;
      expect(selectable, `no selectable option for "${type}"`).toContain(type);
    }
  });

  it('lists facilities without duplicates or blanks', () => {
    expect(new Set(DEFAULT_FACILITIES).size).toBe(DEFAULT_FACILITIES.length);
    for (const facility of DEFAULT_FACILITIES) {
      expect(facility.trim()).toBe(facility);
      expect(facility.length).toBeGreaterThan(1);
    }
  });
});

describe('validators', () => {
  it('recognises valid school types', () => {
    expect(isValidSchoolType('primary')).toBe(true);
    expect(isValidSchoolType('nope')).toBe(false);
    expect(isValidSchoolType(null)).toBe(false);
  });

  it('recognises valid categories', () => {
    expect(isValidCategory('boarding')).toBe(true);
    expect(isValidCategory('semi-boarding')).toBe(false);
  });

  it('falls back to mixed for unknown genders', () => {
    expect(normalizeGender('girls_only')).toBe('girls_only');
    expect(normalizeGender('unknown')).toBe('mixed');
    expect(normalizeGender(undefined)).toBe('mixed');
  });

  it('recognises valid statuses', () => {
    expect(isValidStatus('active')).toBe(true);
    // 'approved' was checked in the dashboard but never written anywhere.
    expect(isValidStatus('approved')).toBe(false);
  });
});
