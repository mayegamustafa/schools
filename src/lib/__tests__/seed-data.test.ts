import { describe, it, expect } from 'vitest';
import { seedSchools, seedReviews } from '../../../prisma/seed-data';
import {
  SCHOOL_TYPES,
  SCHOOL_CATEGORIES,
  SCHOOL_GENDERS,
  SCHOOL_STATUSES,
  DEFAULT_FACILITIES,
} from '../taxonomy';
import { slugify } from '../serialize';

describe('seed schools', () => {
  it('has a usable spread of listings', () => {
    expect(seedSchools.length).toBeGreaterThanOrEqual(10);
  });

  it('uses valid taxonomy values throughout', () => {
    for (const school of seedSchools) {
      expect(school.types.length, `${school.name} has no levels`).toBeGreaterThan(0);

      for (const type of school.types) {
        expect(SCHOOL_TYPES, `${school.name}: bad type "${type}"`).toContain(type);
      }

      expect(SCHOOL_CATEGORIES, `${school.name}: bad category`).toContain(school.category);
      expect(SCHOOL_GENDERS, `${school.name}: bad gender`).toContain(school.gender);
      expect(SCHOOL_STATUSES, `${school.name}: bad status`).toContain(school.status ?? 'active');
    }
  });

  it('only uses facilities the filter sidebar can offer', () => {
    // A facility not in the canonical list becomes a filter chip that matches
    // exactly one school and looks like a typo.
    for (const school of seedSchools) {
      for (const facility of school.facilities) {
        expect(DEFAULT_FACILITIES, `${school.name}: unknown facility "${facility}"`).toContain(facility);
      }
    }
  });

  it('has unique ids and slugs', () => {
    const ids = seedSchools.map(s => s.id);
    expect(new Set(ids).size, 'duplicate school id').toBe(ids.length);

    const slugs = seedSchools.map(s => slugify(s.name));
    expect(new Set(slugs).size, 'duplicate slug').toBe(slugs.length);
  });

  it('has coherent fee ranges', () => {
    for (const school of seedSchools) {
      expect(school.dayMin, `${school.name}: negative lower fee`).toBeGreaterThan(0);
      expect(school.dayMax, `${school.name}: upper fee below lower`).toBeGreaterThanOrEqual(school.dayMin);
    }
  });

  it('places every school inside Uganda', () => {
    // Roughly Uganda's bounding box. A transposed lat/lng would otherwise put a
    // school in the sea and silently break the "near me" search.
    for (const school of seedSchools) {
      expect(school.latitude, `${school.name}: latitude out of range`).toBeGreaterThan(-1.6);
      expect(school.latitude, `${school.name}: latitude out of range`).toBeLessThan(4.3);
      expect(school.longitude, `${school.name}: longitude out of range`).toBeGreaterThan(29.5);
      expect(school.longitude, `${school.name}: longitude out of range`).toBeLessThan(35.1);
    }
  });

  it('rates every school within 0-5', () => {
    for (const school of seedSchools) {
      expect(school.rating).toBeGreaterThanOrEqual(0);
      expect(school.rating).toBeLessThanOrEqual(5);
    }
  });

  it('writes real descriptions, not placeholder text', () => {
    for (const school of seedSchools) {
      expect(school.description.length, `${school.name}: description too short`).toBeGreaterThan(80);
      expect(school.shortDescription.length).toBeGreaterThan(20);
      expect(school.shortDescription.length).toBeLessThanOrEqual(300);
      expect(school.description.toLowerCase()).not.toContain('lorem ipsum');
    }
  });
});

describe('seed reviews', () => {
  it('only references schools that exist', () => {
    const ids = new Set(seedSchools.map(s => s.id));
    for (const review of seedReviews) {
      expect(ids, `review points at unknown school ${review.schoolId}`).toContain(review.schoolId);
    }
  });

  it('matches each school reviewCount to its actual reviews', () => {
    // These are real schools. A reviewCount higher than the reviews behind it
    // would publish an aggregate rating that nothing supports — and the school
    // profile emits AggregateRating JSON-LD from exactly these numbers.
    const counts = new Map<string, number>();
    for (const review of seedReviews) {
      counts.set(review.schoolId, (counts.get(review.schoolId) ?? 0) + 1);
    }

    for (const school of seedSchools) {
      expect(
        counts.get(school.id) ?? 0,
        `${school.name}: reviewCount is ${school.reviewCount} but ${counts.get(school.id) ?? 0} reviews exist`
      ).toBe(school.reviewCount);
    }
  });

  it('gives a school with no reviews a reviewCount of zero', () => {
    const reviewed = new Set(seedReviews.map(r => r.schoolId));
    for (const school of seedSchools) {
      if (!reviewed.has(school.id)) {
        expect(school.reviewCount, `${school.name} should have no reviews`).toBe(0);
      }
    }
  });

  it('uses whole-number ratings between 1 and 5', () => {
    for (const review of seedReviews) {
      expect(Number.isInteger(review.rating)).toBe(true);
      expect(review.rating).toBeGreaterThanOrEqual(1);
      expect(review.rating).toBeLessThanOrEqual(5);
    }
  });

  it('does not let one person review the same school twice', () => {
    // The API enforces this; the fixtures should not contradict it.
    const seen = new Set<string>();
    for (const review of seedReviews) {
      const key = `${review.schoolId}:${review.userId}`;
      expect(seen, `${review.userName} reviews ${review.schoolId} twice`).not.toContain(key);
      seen.add(key);
    }
  });
});
