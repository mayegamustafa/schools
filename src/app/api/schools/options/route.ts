import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getSchoolCategoryLabel,
  getSchoolGenderLabel,
  getSchoolTypeLabel,
} from '@/utils/helpers';

interface OptionItem {
  value: string;
  label: string;
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function parseFacilities(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(item => String(item).trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function toOptions(values: string[], toLabel: (value: string) => string): OptionItem[] {
  return values.map(value => ({ value, label: toLabel(value) }));
}

export async function GET() {
  const schools = await prisma.school.findMany({
    select: {
      type: true,
      category: true,
      gender: true,
      facilities: true,
    },
  });

  const types = uniqueSorted(schools.map(s => s.type));
  const categories = uniqueSorted(schools.map(s => s.category));
  const genders = uniqueSorted(schools.map(s => s.gender));
  const facilities = uniqueSorted(schools.flatMap(s => parseFacilities(s.facilities)));

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
