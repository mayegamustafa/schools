'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface PlaceSuggestion {
  kind: 'place';
  label: string;
  city: string;
  region: string;
  schoolCount: number;
}

interface Props {
  value: string;
  onSelect: (city: string) => void;
}

const DEBOUNCE_MS = 180;

/**
 * City filter with live suggestions drawn from listings we actually have.
 *
 * Deliberately not backed by Nominatim like the registration address field —
 * here the useful answer is "places with schools on SchoolFinder", not "every
 * place in Uganda". Suggesting a town with no listings would only ever lead to
 * an empty results page.
 */
export default function LocationFilter({ value, onSelect }: Props) {
  const [text, setText] = useState(value);
  const [places, setPlaces] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(-1);

  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => setText(value), [value]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();
  }, []);

  const runQuery = useCallback(async (q: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const res = await fetch(`/api/schools/suggest?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error('Lookup failed');
      const data = await res.json();
      setPlaces(data.places || []);
      setOpen((data.places || []).length > 0);
      setHighlight(-1);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setPlaces([]);
      setOpen(false);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  const handleChange = (next: string) => {
    setText(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (next.trim().length < 2) {
      abortRef.current?.abort();
      setPlaces([]);
      setOpen(false);
      setLoading(false);
      // Clearing the box clears the filter.
      if (next.trim() === '' && value) onSelect('');
      return;
    }

    debounceRef.current = setTimeout(() => void runQuery(next.trim()), DEBOUNCE_MS);
  };

  const pick = (place: PlaceSuggestion) => {
    setText(place.city);
    setOpen(false);
    onSelect(place.city);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || places.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight(h => (h + 1) % places.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => (h <= 0 ? places.length - 1 : h - 1));
    } else if (e.key === 'Enter' && highlight >= 0) {
      e.preventDefault();
      pick(places[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={text}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => places.length > 0 && setOpen(true)}
          placeholder="Any city"
          autoComplete="off"
          aria-label="Filter by city"
          className="w-full pl-9 pr-8 py-2 text-sm border border-border rounded-lg bg-surface text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>

        {loading && (
          <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
          </svg>
        )}

        {!loading && text && (
          <button
            type="button"
            onClick={() => { setText(''); setPlaces([]); setOpen(false); onSelect(''); }}
            aria-label="Clear city filter"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-hover"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
      </div>

      {open && places.length > 0 && (
        <div className="absolute z-40 top-full left-0 right-0 mt-1.5 bg-surface border border-border rounded-lg shadow-lg overflow-hidden max-h-56 overflow-y-auto">
          {places.map((place, i) => (
            <button
              key={place.label}
              type="button"
              onClick={() => pick(place)}
              onMouseEnter={() => setHighlight(i)}
              className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 transition-colors ${
                highlight === i ? 'bg-hover' : 'hover:bg-hover'
              }`}
            >
              <span className="text-sm text-text-primary truncate">{place.label}</span>
              <span className="text-xs text-text-muted shrink-0">{place.schoolCount}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
