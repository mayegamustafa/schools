import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getSchoolCategoryLabel,
  getSchoolGenderLabel,
  getSchoolTypeLabel,
} from '@/utils/helpers';
import {
  DEFAULT_CATEGORY_OPTIONS,
  DEFAULT_FACILITIES,
  DEFAULT_GENDER_OPTIONS,
  SELECTABLE_SCHOOL_TYPES,
  typeFamily,
} from '@/lib/taxonomy';

interface OptionItem {
  value: string;
  label: string;
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function toOptions(values: string[], toLabel: (value: string) => string): OptionItem[] {
  return values.map(value => ({ value, label: toLabel(value) }));
}

/** Static fallback used when live options can't be derived. */
function defaultOptions() {
  return {
    types: toOptions([...SELECTABLE_SCHOOL_TYPES], getSchoolTypeLabel),
    categories: DEFAULT_CATEGORY_OPTIONS.map(o => ({ value: o.value, label: o.label })),
    genders: DEFAULT_GENDER_OPTIONS.map(o => ({ value: o.value, label: o.label })),
    facilities: [...DEFAULT_FACILITIES],
  };
}

export async function GET() {
  try {
    // Only active listings shape the public filters — pending and rejected
    // schools shouldn't leak their categories into the sidebar.
    const schools = await prisma.school.findMany({
      where: { status: 'active' },
      select: {
        type: true,
        types: true,
        category: true,
        gender: true,
        facilities: true,
      },
    });

    // Collapse "secondary_o" / "secondary_oa" into one "Secondary" chip so the
    // same level doesn't appear as two competing filter options.
    const types = uniqueSorted(
      schools.flatMap(s => (s.types.length > 0 ? s.types : [s.type])).map(typeFamily)
    );
    const categories = uniqueSorted(schools.map(s => s.category));
    const genders = uniqueSorted(schools.map(s => s.gender));
    const facilities = uniqueSorted(schools.flatMap(s => s.facilities));

    const fallback = defaultOptions();

    return NextResponse.json({
      // An empty database still needs to offer choices, or the register form
      // has nothing to select and no school can be listed.
      types: types.length ? toOptions(types, getSchoolTypeLabel) : fallback.types,
      categories: categories.length
        ? toOptions(categories, getSchoolCategoryLabel)
        : fallback.categories,
      genders: genders.length ? toOptions(genders, getSchoolGenderLabel) : fallback.genders,
      facilities: facilities.length ? facilities : fallback.facilities,
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    // Most likely cause: the database schema is behind the deployed code — the
    // `types` and array-valued `facilities` columns arrive with a migration.
    // Filter options are not worth a 500 that blocks the whole register form, so
    // serve the static list and log loudly instead.
    console.error('[schools/options] falling back to static options:', error);

    return NextResponse.json(defaultOptions(), {
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
