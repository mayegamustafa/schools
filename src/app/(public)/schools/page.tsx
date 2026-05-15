'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import SchoolCard from '@/components/schools/SchoolCard';
import SearchBar from '@/components/schools/SearchBar';
import FilterSidebar from '@/components/schools/FilterSidebar';
import { ListSkeleton } from '@/components/ui/Skeletons';
import { BuildingOfficeIcon } from '@/components/ui/Icons';
import { SearchFilters, School, SchoolType, SchoolGender } from '@/types';

const toSortBy = (value: string | null): SearchFilters['sortBy'] => {
  if (value === 'rating') return 'rating';
  if (value === 'fees-low') return 'fees_low';
  if (value === 'fees-high') return 'fees_high';
  if (value === 'newest') return 'newest';
  return 'relevance';
};

const getFiltersFromParams = (searchParams: { get: (key: string) => string | null }): SearchFilters => ({
  query: searchParams.get('q') || '',
  type: (searchParams.get('type') as SchoolType | null) || undefined,
  category: (searchParams.get('category') as SearchFilters['category'] | null) || undefined,
  gender: (searchParams.get('gender') as SchoolGender | null) || undefined,
  sortBy: toSortBy(searchParams.get('sort')),
  latitude: searchParams.get('lat') ? Number(searchParams.get('lat')) : undefined,
  longitude: searchParams.get('lng') ? Number(searchParams.get('lng')) : undefined,
  radius: searchParams.get('radius') ? Number(searchParams.get('radius')) : 25,
});

function SchoolsResults({ initialFilters }: { initialFilters: SearchFilters }) {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [nearArea, setNearArea] = useState<string>('');

  const hasNearFilter = typeof filters.latitude === 'number' && typeof filters.longitude === 'number';

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.query) params.set('q', filters.query);
    if (filters.type) params.set('type', filters.type);
    if (filters.category) params.set('category', filters.category);
    if (filters.gender) params.set('gender', filters.gender);
    if (filters.minFees) params.set('minFees', String(filters.minFees));
    if (filters.maxFees) params.set('maxFees', String(filters.maxFees));
    if (filters.rating) params.set('rating', String(filters.rating));
    if (filters.facilities?.length) params.set('facilities', filters.facilities.join(','));
    if (filters.sortBy === 'rating') params.set('sort', 'rating');
    if (filters.sortBy === 'fees_low') params.set('sort', 'fees-low');
    if (filters.sortBy === 'fees_high') params.set('sort', 'fees-high');
    if (filters.sortBy === 'newest') params.set('sort', 'newest');
    if (filters.latitude && filters.longitude) {
      params.set('near', '1');
      params.set('lat', String(filters.latitude));
      params.set('lng', String(filters.longitude));
      params.set('radius', String(filters.radius || 25));
    }

    fetch(`/api/schools?${params.toString()}`)
      .then(res => res.json())
      .then(data => setSchools(data.schools || []))
      .catch(() => setSchools([]))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    if (!hasNearFilter || filters.latitude === undefined || filters.longitude === undefined) return;

    const controller = new AbortController();
    const loadArea = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${filters.latitude}&lon=${filters.longitude}`,
          { signal: controller.signal }
        );
        if (!res.ok) {
          setNearArea('');
          return;
        }
        const data = await res.json();
        const address = data.address || {};
        const area = address.city
          || address.town
          || address.village
          || address.suburb
          || address.county
          || address.state
          || '';
        setNearArea(area);
      } catch {
        setNearArea('');
      }
    };

    loadArea();
    return () => controller.abort();
  }, [hasNearFilter, filters.latitude, filters.longitude]);

  const updateFilters = (partial: Partial<SearchFilters>) => {
    setLoading(true);
    setFilters(prev => ({ ...prev, ...partial }));
  };

  const resetFilters = () => {
    setLoading(true);
    setFilters({ query: '', sortBy: 'relevance' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Search Header */}
      <div className="mb-8">
        <SearchBar initialQuery={filters.query} className="max-w-3xl" />
      </div>

      <div className="flex gap-8">
        {/* Desktop Filters */}
        <FilterSidebar
          filters={filters}
          onChange={updateFilters}
          onReset={resetFilters}
          className="hidden lg:block w-72 shrink-0 sticky top-24 self-start max-h-[calc(100vh-8rem)] overflow-y-auto"
        />

        {/* Results */}
        <div className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div>
                {hasNearFilter && (
                  <p className="text-sm font-semibold text-text-primary mb-0.5">
                    Schools around {nearArea || 'your area'} and nearby
                  </p>
                )}
                <p className="text-sm text-text-secondary">
                  <span className="font-semibold text-text-primary">{schools.length}</span> schools found
                  {hasNearFilter && (
                    <span className="ml-2">within {filters.radius || 25} km</span>
                  )}
                </p>
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden flex items-center gap-2 px-3 py-2 text-sm font-medium border border-border rounded-lg hover:bg-gray-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
              </button>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={filters.sortBy}
                onChange={e => updateFilters({ sortBy: e.target.value as SearchFilters['sortBy'] })}
                className="text-sm border border-border rounded-lg px-3 py-2 bg-white text-text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                <option value="relevance">Relevance</option>
                <option value="rating">Highest Rated</option>
                <option value="fees_low">Fees: Low to High</option>
                <option value="fees_high">Fees: High to Low</option>
                <option value="newest">Newest</option>
              </select>
              <div className="hidden sm:flex items-center border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setLayout('grid')}
                  className={`p-2 ${layout === 'grid' ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-gray-50'}`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setLayout('list')}
                  className={`p-2 ${layout === 'list' ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-gray-50'}`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Filters Drawer */}
          {showFilters && (
            <div className="lg:hidden mb-6">
              <FilterSidebar
                filters={filters}
                onChange={updateFilters}
                onReset={resetFilters}
              />
            </div>
          )}

          {/* Results Grid/List */}
          {loading ? (
            <ListSkeleton count={6} />
          ) : schools.length > 0 ? (
            <div className={layout === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
              : 'space-y-4'
            }>
              {schools.map(school => (
                <SchoolCard key={school.id} school={school} layout={layout} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="flex justify-center mb-4"><BuildingOfficeIcon className="w-16 h-16 text-text-muted" /></div>
              <h3 className="text-xl font-semibold text-text-primary mb-2">No schools found</h3>
              <p className="text-text-secondary mb-6">Try adjusting your filters or search terms</p>
              <button
                onClick={resetFilters}
                className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SchoolsContent() {
  const searchParams = useSearchParams();
  const initialFilters = getFiltersFromParams(searchParams);

  return <SchoolsResults key={searchParams.toString()} initialFilters={initialFilters} />;
}

export default function SchoolsPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="skeleton h-14 w-full max-w-3xl rounded-2xl mb-8" />
        <ListSkeleton count={6} />
      </div>
    }>
      <SchoolsContent />
    </Suspense>
  );
}
