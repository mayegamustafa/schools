import { describe, it, expect } from 'vitest';
import {
  normalizeSchoolTypes,
  expandTypeFilter,
  typeFamily,
  isValidSchoolType,
  isValidCategory,
  normalizeGender,
  isValidStatus,
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
