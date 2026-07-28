import { describe, it, expect } from 'vitest';
import { serializeSchool, slugify } from '../serialize';
import type { School as DbSchool } from '@/generated/prisma/client';

function makeRow(overrides: Partial<DbSchool> = {}): DbSchool {
  return {
    id: 'sch_1',
    name: 'Kampala Junior Academy',
    slug: 'kampala-junior-academy',
    ownerUserId: 'usr_1',
    type: 'primary',
    types: ['primary'],
    category: 'day',
    gender: 'mixed',
    description: 'A school.',
    shortDescription: 'A school.',
    logo: '',
    coverImage: '',
    gallery: '[]',
    videos: '[]',
    address: '12 Bombo Road',
    city: 'Kampala',
    region: 'Central Region',
    country: 'Uganda',
    latitude: 0.3476,
    longitude: 32.5825,
    phone: '+256700000000',
    email: 'info@example.ac.ug',
    website: null,
    whatsapp: null,
    currency: 'UGX',
    dayMin: 500000,
    dayMax: 900000,
    boardingMin: null,
    boardingMax: null,
    facilities: ['Library'],
    rating: 4.5,
    reviewCount: 2,
    isVerified: false,
    emailVerified: false,
    isFeatured: false,
    isPremium: false,
    status: 'active',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
    ...overrides,
  } as DbSchool;
}

describe('serializeSchool', () => {
  it('exposes every level a school offers', () => {
    const school = serializeSchool(makeRow({ type: 'primary', types: ['primary', 'secondary_oa'] }));
    expect(school.types).toEqual(['primary', 'secondary_oa']);
  });

  it('falls back to the scalar type for rows predating the multi-level migration', () => {
    const school = serializeSchool(makeRow({ type: 'primary', types: [] }));
    expect(school.types).toEqual(['primary']);
  });

  it('substitutes fallback images when none are set', () => {
    const school = serializeSchool(makeRow({ logo: '', coverImage: '' }));
    expect(school.coverImage).toBe('/students-working-laptop-school.jpg');
    expect(school.logo).toBe('/file.svg');
  });

  it('keeps real image URLs', () => {
    const cover = 'https://res.cloudinary.com/demo/image/upload/cover.jpg';
    const school = serializeSchool(makeRow({ coverImage: cover }));
    expect(school.coverImage).toBe(cover);
  });

  it('uses the cover as the gallery when no gallery exists', () => {
    const school = serializeSchool(makeRow({ gallery: '[]' }));
    expect(school.gallery).toEqual([school.coverImage]);
  });

  it('survives malformed gallery JSON rather than throwing', () => {
    const school = serializeSchool(makeRow({ gallery: 'not json' }));
    expect(school.gallery).toEqual([school.coverImage]);
  });

  it('drops empty facility entries', () => {
    const school = serializeSchool(makeRow({ facilities: ['Library', '', 'Sports Field'] }));
    expect(school.facilities).toEqual(['Library', 'Sports Field']);
  });

  it('emits ISO date strings', () => {
    const school = serializeSchool(makeRow());
    expect(school.createdAt).toBe('2026-01-01T00:00:00.000Z');
  });
});

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Kampala Junior Academy')).toBe('kampala-junior-academy');
  });

  it('strips punctuation', () => {
    expect(slugify("St. Mary's College, Kisubi")).toBe('st-marys-college-kisubi');
  });

  it('collapses repeated separators and trims edges', () => {
    expect(slugify('  Nakawa   --  Kampala  ')).toBe('nakawa-kampala');
  });
});
