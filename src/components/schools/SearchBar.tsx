'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { sanitizeImageSrc, FALLBACK_LOGO_IMAGE } from '@/utils/helpers';

interface SchoolSuggestion {
  kind: 'school';
  id: string;
  slug: string;
  name: string;
  city: string;
  region: string;
  typeLabel: string;
  logo: string;
  rating: number;
  reviewCount: number;
}

interface PlaceSuggestion {
  kind: 'place';
  label: string;
  city: string;
  region: string;
  schoolCount: number;
}

type Suggestion = SchoolSuggestion | PlaceSuggestion;

interface SearchBarProps {
  large?: boolean;
  initialQuery?: string;
  className?: string;
  variant?: 'default' | 'hero';
}

const DEBOUNCE_MS = 180;
const MIN_QUERY_LENGTH = 2;

export default function SearchBar({
  large = false, initialQuery = '', className = '', variant = 'default',
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [schools, setSchools] = useState<SchoolSuggestion[]>([]);
  const [places, setPlaces] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [focused, setFocused] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const router = useRouter();

  // Flat list drives keyboard navigation across both groups.
  const flat: Suggestion[] = [...schools, ...places];

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cancel any in-flight work when the component goes away.
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();
  }, []);

  const runSearch = useCallback(async (value: string) => {
    // Abort the previous request — without this, a slow early response can land
    // after a faster later one and overwrite the dropdown with stale results.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const res = await fetch(`/api/schools/suggest?q=${encodeURIComponent(value)}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error('Suggest failed');

      const data = await res.json();
      setSchools(data.schools || []);
      setPlaces(data.places || []);
      setOpen(true);
      setHighlight(-1);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setSchools([]);
      setPlaces([]);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < MIN_QUERY_LENGTH) {
      abortRef.current?.abort();
      setSchools([]);
      setPlaces([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    debounceRef.current = setTimeout(() => void runSearch(value.trim()), DEBOUNCE_MS);
  };

  const goToSearch = (searchQuery?: string) => {
    const q = (searchQuery ?? query).trim();
    if (!q) return;
    setOpen(false);
    router.push(`/schools?q=${encodeURIComponent(q)}`);
  };

  const selectSuggestion = (suggestion: Suggestion) => {
    setOpen(false);
    if (suggestion.kind === 'school') {
      // Straight to the school — no reason to make them search for what they picked.
      router.push(`/schools/${suggestion.slug}`);
    } else {
      setQuery(suggestion.city);
      router.push(`/schools?q=${encodeURIComponent(suggestion.city)}`);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (open && highlight >= 0 && flat[highlight]) selectSuggestion(flat[highlight]);
      else goToSearch();
      return;
    }
    if (!open || flat.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight(h => (h + 1) % flat.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => (h <= 0 ? flat.length - 1 : h - 1));
    } else if (e.key === 'Escape') {
      setOpen(false);
      setHighlight(-1);
    }
  };

  const handleNearMe = () => {
    if (!navigator.geolocation) {
      router.push('/schools');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => router.push(`/schools?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}&near=1`),
      () => router.push('/schools')
    );
  };

  const isHero = variant === 'hero';
  const hasResults = flat.length > 0;

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className={`flex items-center rounded-xl transition-colors border ${
        focused ? 'border-primary shadow-md bg-surface' : 'border-border bg-surface'
      } ${large || isHero ? 'p-2.5' : 'p-2'}`}>
        <div className="flex items-center flex-1 gap-2.5 px-3 min-w-0">
          {loading ? (
            <svg className={`shrink-0 animate-spin text-primary ${large || isHero ? 'w-5 h-5' : 'w-4 h-4'}`} viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
            </svg>
          ) : (
            <svg className={`shrink-0 transition-colors ${focused ? 'text-primary' : 'text-text-muted'} ${large || isHero ? 'w-5 h-5' : 'w-4 h-4'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
          <input
            type="text"
            value={query}
            onChange={e => handleChange(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => {
              setFocused(true);
              if (hasResults) setOpen(true);
            }}
            placeholder="Search schools by name, location, or type..."
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            aria-controls="search-suggestions"
            autoComplete="off"
            className={`flex-1 min-w-0 bg-transparent outline-none text-text-primary placeholder:text-text-muted ${large || isHero ? 'text-base py-1.5' : 'text-sm py-1'}`}
          />
          {query && (
            <button
              type="button"
              onClick={() => { handleChange(''); setQuery(''); }}
              aria-label="Clear search"
              className="shrink-0 p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-hover transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleNearMe}
            className={`hidden sm:flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors border-l border-border pl-3 ${large || isHero ? 'px-3 py-2 text-sm' : 'px-2.5 py-1.5 text-xs'}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Near Me
          </button>
          <button
            onClick={() => goToSearch()}
            className={`bg-primary text-white font-medium rounded-md hover:bg-primary-dark transition-colors btn-press ${large || isHero ? 'px-5 py-2.5 text-sm' : 'px-4 py-2 text-sm'}`}
          >
            Search
          </button>
        </div>
      </div>

      {open && query.trim().length >= MIN_QUERY_LENGTH && (
        <div
          id="search-suggestions"
          role="listbox"
          className="absolute top-full left-0 right-0 mt-2 bg-surface rounded-xl border border-border shadow-lg overflow-hidden z-50 animate-fade-in max-h-[24rem] overflow-y-auto"
        >
          {!hasResults && !loading && (
            <p className="px-4 py-4 text-sm text-text-secondary">
              No matches for <span className="font-medium text-text-primary">{query}</span>
            </p>
          )}

          {schools.length > 0 && (
            <>
              <p className="px-4 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                Schools
              </p>
              {schools.map((school, i) => (
                <button
                  key={school.id}
                  role="option"
                  aria-selected={highlight === i}
                  onClick={() => selectSuggestion(school)}
                  onMouseEnter={() => setHighlight(i)}
                  className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors ${
                    highlight === i ? 'bg-hover' : 'hover:bg-hover'
                  }`}
                >
                  <span className="relative w-9 h-9 rounded-lg overflow-hidden border border-border shrink-0 bg-white">
                    <Image
                      src={sanitizeImageSrc(school.logo, FALLBACK_LOGO_IMAGE)}
                      alt=""
                      fill
                      sizes="36px"
                      className="object-contain p-0.5"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-text-primary truncate">{school.name}</span>
                    <span className="block text-xs text-text-secondary truncate">
                      {school.typeLabel} · {school.city}
                    </span>
                  </span>
                  {school.reviewCount > 0 && (
                    <span className="text-xs text-text-muted shrink-0">★ {school.rating.toFixed(1)}</span>
                  )}
                </button>
              ))}
            </>
          )}

          {places.length > 0 && (
            <>
              <p className="px-4 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted border-t border-border mt-1">
                Locations
              </p>
              {places.map((place, i) => {
                const index = schools.length + i;
                return (
                  <button
                    key={place.label}
                    role="option"
                    aria-selected={highlight === index}
                    onClick={() => selectSuggestion(place)}
                    onMouseEnter={() => setHighlight(index)}
                    className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors ${
                      highlight === index ? 'bg-hover' : 'hover:bg-hover'
                    }`}
                  >
                    <span className="w-9 h-9 rounded-lg bg-hover flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-text-primary truncate">{place.label}</span>
                      <span className="block text-xs text-text-secondary">
                        {place.schoolCount} school{place.schoolCount === 1 ? '' : 's'}
                      </span>
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
