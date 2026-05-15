'use client';

import { SearchFilters, SchoolType, SchoolCategory, SchoolGender } from '@/types';
import { useState } from 'react';
import useSWR from 'swr';

interface SelectOption {
  value: string;
  label: string;
}

interface SchoolOptionsResponse {
  types: SelectOption[];
  categories: SelectOption[];
  genders: SelectOption[];
  facilities: string[];
}

const optionsFetcher = async (url: string) => {
  const res = await fetch(url);
  const payload = await res.json();
  if (!res.ok) throw new Error(payload.error || 'Failed to load filter options');
  return payload as SchoolOptionsResponse;
};

interface FilterSidebarProps {
  filters: SearchFilters;
  onChange: (filters: Partial<SearchFilters>) => void;
  onReset: () => void;
  className?: string;
}

export default function FilterSidebar({ filters, onChange, onReset, className = '' }: FilterSidebarProps) {
  const [showMore, setShowMore] = useState(false);
  const { data: optionsData } = useSWR('/api/schools/options', optionsFetcher, {
    revalidateOnFocus: false,
  });

  const schoolTypes = optionsData?.types || [];
  const schoolCategories = optionsData?.categories || [];
  const schoolGenders = optionsData?.genders || [];
  const facilities = optionsData?.facilities || [];

  return (
    <aside className={`bg-white rounded-2xl border border-border p-5 ${className}`}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-text-primary">Filters</h3>
        <button onClick={onReset} className="text-sm text-primary hover:text-primary-dark font-medium">
          Reset
        </button>
      </div>

      {/* School Type */}
      <div className="border-b border-border pb-4 mb-4">
        <span className="text-sm font-semibold text-text-primary block mb-3">Type</span>
        <div className="flex flex-wrap gap-2">
          {schoolTypes.map(t => (
            <button
              key={t.value}
              onClick={() => onChange({ type: filters.type === t.value ? undefined : t.value as SchoolType })}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                filters.type === t.value
                  ? 'bg-primary text-white border-primary'
                  : 'border-border text-text-secondary hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      <div className="border-b border-border pb-4 mb-4">
        <span className="text-sm font-semibold text-text-primary block mb-3">Category</span>
        <div className="flex flex-wrap gap-2">
          {schoolCategories.map(c => (
            <button
              key={c.value}
              onClick={() => onChange({ category: filters.category === c.value ? undefined : c.value as SchoolCategory })}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                filters.category === c.value
                  ? 'bg-primary text-white border-primary'
                  : 'border-border text-text-secondary hover:bg-gray-50'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fees Range */}
      <div className="border-b border-border pb-4 mb-4">
        <span className="text-sm font-semibold text-text-primary block mb-3">Gender Mode</span>
        <div className="flex flex-wrap gap-2">
          {schoolGenders.map(g => (
            <button
              key={g.value}
              onClick={() => onChange({ gender: filters.gender === g.value ? undefined : g.value as SchoolGender })}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                filters.gender === g.value
                  ? 'bg-primary text-white border-primary'
                  : 'border-border text-text-secondary hover:bg-gray-50'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fees Range */}
      <div className="border-b border-border pb-4 mb-4">
        <span className="text-sm font-semibold text-text-primary block mb-3">Lower / Upper Section Fees (UGX/term)</span>
        <div className="flex gap-3">
          <input
            type="number"
            value={filters.minFees || ''}
            onChange={e => onChange({ minFees: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="Lower section"
            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
          <input
            type="number"
            value={filters.maxFees || ''}
            onChange={e => onChange({ maxFees: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="Upper section"
            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>
      </div>

      {/* More Filters — hidden by default */}
      {!showMore ? (
        <button
          onClick={() => setShowMore(true)}
          className="w-full text-sm text-primary font-medium py-2 hover:text-primary-dark transition-colors"
        >
          + More filters
        </button>
      ) : (
        <>
          {/* Facilities */}
          <div className="border-b border-border pb-4 mb-4">
            <span className="text-sm font-semibold text-text-primary block mb-3">Facilities</span>
            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
              {facilities.map(f => {
                const isChecked = filters.facilities?.includes(f) || false;
                return (
                  <button
                    key={f}
                    onClick={() => {
                      const current = filters.facilities || [];
                      const next = isChecked ? current.filter(x => x !== f) : [...current, f];
                      onChange({ facilities: next.length > 0 ? next : undefined });
                    }}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                      isChecked
                        ? 'bg-primary text-white border-primary'
                        : 'border-border text-text-secondary hover:bg-gray-50'
                    }`}
                  >
                    {f}
                  </button>
                );
              })}
              {facilities.length === 0 && (
                <p className="text-xs text-text-secondary">No facility options available yet.</p>
              )}
            </div>
          </div>

          {/* Rating */}
          <div className="pb-2 mb-2">
            <span className="text-sm font-semibold text-text-primary block mb-3">Min Rating</span>
            <div className="flex gap-2">
              {[4, 3, 2, 1].map(r => (
                <button
                  key={r}
                  onClick={() => onChange({ rating: filters.rating === r ? undefined : r })}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    filters.rating === r ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border text-text-secondary hover:bg-gray-50'
                  }`}
                >
                  {r}+
                  <svg className="w-3.5 h-3.5 text-accent" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setShowMore(false)}
            className="w-full text-sm text-text-muted font-medium py-2 hover:text-text-secondary transition-colors"
          >
            Show less
          </button>
        </>
      )}
    </aside>
  );
}
