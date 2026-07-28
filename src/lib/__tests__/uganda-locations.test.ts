import { describe, it, expect } from 'vitest';
import {
  UGANDA_PLACES,
  UGANDA_REGIONS,
  regionForPlace,
  suggestPlaces,
  suggestRegions,
} from '../uganda-locations';

describe('place data', () => {
  it('covers every district and town without duplicates', () => {
    expect(UGANDA_PLACES.length).toBeGreaterThan(120);
    const names = UGANDA_PLACES.map(p => p.name.toLowerCase());
    expect(new Set(names).size, 'duplicate place name').toBe(names.length);
  });

  it('assigns every place to a real region', () => {
    for (const place of UGANDA_PLACES) {
      expect(UGANDA_REGIONS, `${place.name} has an unknown region`).toContain(place.region);
    }
  });

  it('covers all four regions', () => {
    const regions = new Set(UGANDA_PLACES.map(p => p.region));
    expect(regions.size).toBe(4);
  });
});

describe('suggestPlaces', () => {
  it('ranks prefix matches above substring matches', () => {
    // Someone typing "kam" wants Kampala first, not Bukomansimbi.
    const results = suggestPlaces('kam').map(p => p.name);
    expect(results[0]).toBe('Kampala');
  });

  it('is case-insensitive', () => {
    expect(suggestPlaces('KAMPALA').map(p => p.name)).toContain('Kampala');
    expect(suggestPlaces('kampala').map(p => p.name)).toContain('Kampala');
  });

  it('ignores surrounding whitespace', () => {
    expect(suggestPlaces('  jinja  ').map(p => p.name)).toContain('Jinja');
  });

  it('returns nothing for an empty query', () => {
    expect(suggestPlaces('')).toEqual([]);
    expect(suggestPlaces('   ')).toEqual([]);
  });

  it('respects the limit', () => {
    expect(suggestPlaces('a', 3).length).toBeLessThanOrEqual(3);
  });

  it('returns nothing for a place we do not know', () => {
    expect(suggestPlaces('zzzznowhere')).toEqual([]);
  });

  it('finds towns as well as districts', () => {
    expect(suggestPlaces('entebbe').map(p => p.name)).toContain('Entebbe');
    expect(suggestPlaces('ntinda').map(p => p.name)).toContain('Ntinda');
  });
});

describe('regionForPlace', () => {
  it('resolves the region for a known place', () => {
    expect(regionForPlace('Kampala')).toBe('Central Region');
    expect(regionForPlace('Jinja')).toBe('Eastern Region');
    expect(regionForPlace('Gulu')).toBe('Northern Region');
    expect(regionForPlace('Mbarara')).toBe('Western Region');
  });

  it('is case- and whitespace-insensitive', () => {
    expect(regionForPlace('  kampala ')).toBe('Central Region');
  });

  it('returns null for an unknown place, so the form does not guess wrongly', () => {
    expect(regionForPlace('Atlantis')).toBeNull();
    expect(regionForPlace('')).toBeNull();
  });
});

describe('suggestRegions', () => {
  it('offers every region when the field is empty', () => {
    expect(suggestRegions('')).toHaveLength(4);
  });

  it('filters by substring', () => {
    expect(suggestRegions('cent')).toEqual(['Central Region']);
  });

  it('returns nothing for no match', () => {
    expect(suggestRegions('southern')).toEqual([]);
  });
});
