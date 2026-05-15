'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { School } from '@/types';
import { StarRating } from '@/components/ui/StarRating';
import { formatCurrency, getSchoolTypeLabel, getSchoolCategoryLabel, getSchoolGenderLabel, sanitizeImageSrc } from '@/utils/helpers';
import { ScaleIcon } from '@/components/ui/Icons';

export default function ComparePage() {
  const { compareList, removeFromCompare, clearCompare } = useApp();
  const [schools, setSchools] = useState<School[]>([]);

  useEffect(() => {
    if (compareList.length === 0) return;

    fetch(`/api/schools?status=all&ids=${compareList.join(',')}`)
      .then(res => res.json())
      .then(data => {
        setSchools((data.schools || []) as School[]);
      })
      .catch(() => setSchools([]));
  }, [compareList]);

  const visibleSchools = compareList
    .map(id => schools.find(s => s.id === id))
    .filter(Boolean) as School[];

  if (compareList.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="flex justify-center mb-4"><ScaleIcon className="w-16 h-16 text-text-muted" /></div>
        <h1 className="text-2xl font-bold text-text-primary mb-3">Compare Schools</h1>
        <p className="text-text-secondary mb-8 max-w-md mx-auto">
          Add schools to your compare list to see them side by side. You can compare up to 4 schools at once.
        </p>
        <Link href="/schools" className="px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary-dark transition-colors">
          Browse Schools
        </Link>
      </div>
    );
  }

  if (visibleSchools.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <p className="text-text-secondary">Loading selected schools...</p>
      </div>
    );
  }

  const allFacilities = [...new Set(visibleSchools.flatMap(s => s.facilities))].sort();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Compare Schools</h1>
          <p className="text-text-secondary mt-1">Comparing {visibleSchools.length} school{visibleSchools.length > 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/schools" className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-gray-50 transition-colors">
            Add More
          </Link>
          <button onClick={clearCompare} className="px-4 py-2 text-sm font-medium text-error border border-error/30 rounded-lg hover:bg-error/5 transition-colors">
            Clear All
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr>
              <th className="text-left p-4 bg-gray-50 rounded-tl-2xl w-48">
                <span className="text-sm font-semibold text-text-primary">Attribute</span>
              </th>
              {visibleSchools.map((school, i) => (
                <th key={school.id} className={`p-4 bg-gray-50 ${i === visibleSchools.length - 1 ? 'rounded-tr-2xl' : ''}`}>
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden">
                      <Image src={sanitizeImageSrc(school.coverImage)} alt={school.name} fill className="object-cover" sizes="64px" />
                    </div>
                    <Link href={`/schools/${school.id}`} className="text-sm font-semibold text-text-primary hover:text-primary text-center">
                      {school.name}
                    </Link>
                    <button onClick={() => removeFromCompare(school.id)} className="text-xs text-error hover:underline">
                      Remove
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { label: 'Rating', render: (s: School) => (
                <div className="flex flex-col items-center gap-1">
                  <StarRating rating={s.rating} />
                  <span className="text-sm font-semibold">{s.rating} ({s.reviewCount})</span>
                </div>
              )},
              { label: 'Type', render: (s: School) => getSchoolTypeLabel(s.type) },
              { label: 'Category', render: (s: School) => getSchoolCategoryLabel(s.category) },
              { label: 'Gender Mode', render: (s: School) => getSchoolGenderLabel(s.gender) },
              { label: 'Location', render: (s: School) => `${s.location.city}, ${s.location.region}` },
              { label: 'Lower Section Fees', render: (s: School) => s.fees.dayMin > 0 ? `${formatCurrency(s.fees.dayMin)}` : 'On request' },
              { label: 'Upper Section Fees', render: (s: School) => s.fees.dayMax > 0 ? `${formatCurrency(s.fees.dayMax)}` : 'On request' },
              { label: 'Boarding Fees', render: (s: School) => s.fees.boardingMin ? `${formatCurrency(s.fees.boardingMin)} - ${formatCurrency(s.fees.boardingMax!)}` : 'N/A' },
              { label: 'Verified', render: (s: School) => s.isVerified ? 'Yes' : 'No' },
              { label: 'Total Facilities', render: (s: School) => `${s.facilities.length}` },
            ].map((row, i) => (
              <tr key={row.label} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                <td className="p-4 text-sm font-medium text-text-primary">{row.label}</td>
                {visibleSchools.map(school => (
                  <td key={school.id} className="p-4 text-center text-sm text-text-secondary">
                    {typeof row.render === 'function' ? row.render(school) : ''}
                  </td>
                ))}
              </tr>
            ))}
            {/* Facilities comparison */}
            <tr className="bg-gray-50">
              <td colSpan={visibleSchools.length + 1} className="p-4">
                <span className="text-sm font-semibold text-text-primary">Facilities</span>
              </td>
            </tr>
            {allFacilities.map((facility, i) => (
              <tr key={facility} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                <td className="p-4 text-sm text-text-secondary">{facility}</td>
                {visibleSchools.map(school => (
                  <td key={school.id} className="p-4 text-center">
                    {school.facilities.includes(facility) ? (
                      <svg className="w-5 h-5 text-secondary mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    ) : (
                      <svg className="w-5 h-5 text-text-muted mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" /></svg>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
