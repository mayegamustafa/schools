import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getSchoolCategoryLabel,
  getSchoolGenderLabel,
  getSchoolTypeLabel,
} from '@/utils/helpers';
import { typeFamily } from '@/lib/taxonomy';

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

export async function GET() {
  // Only active listings shape the public filters — pending and rejected schools
  // shouldn't leak their categories into the sidebar.
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

  // Collapse "secondary_o" / "secondary_oa" into one "Secondary" chip so the same
  // level doesn't appear as two competing filter options.
  const types = uniqueSorted(
    schools.flatMap(s => (s.types.length > 0 ? s.types : [s.type])).map(typeFamily)
  );
  const categories = uniqueSorted(schools.map(s => s.category));
  const genders = uniqueSorted(schools.map(s => s.gender));
  const facilities = uniqueSorted(schools.flatMap(s => s.facilities));

  return NextResponse.json({
    types: toOptions(types, getSchoolTypeLabel),
    categories: toOptions(categories, getSchoolCategoryLabel),
    genders: toOptions(genders, getSchoolGenderLabel),
    facilities,
  }, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
