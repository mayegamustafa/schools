'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export interface LocationResult {
  address: string;
  city: string;
  region: string;
  latitude: string;
  longitude: string;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: Record<string, string>;
}

interface Props {
  value: string;
  onChange: (address: string) => void;
  onSelect: (result: LocationResult) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
}

/**
 * Address field with OpenStreetMap (Nominatim) autocomplete — an alternative to
 * the GPS picker. Typing suggests Ugandan places; selecting one fills the
 * address, city, region, and coordinates in one tap.
 */
export default function LocationAutocomplete({ value, onChange, onSelect, placeholder, required, id }: Props) {
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const runQuery = useCallback((q: string) => {
    if (q.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=ug&addressdetails=1&limit=6&q=${encodeURIComponent(q)}`,
      { headers: { Accept: 'application/json' } }
    )
      .then(r => r.json())
      .then((data: NominatimResult[]) => {
        const list = Array.isArray(data) ? data : [];
        setSuggestions(list);
        setOpen(list.length > 0);
        setHighlight(-1);
      })
      .catch(() => {
        setSuggestions([]);
        setOpen(false);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (v: string) => {
    onChange(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runQuery(v), 400);
  };

  const pick = (item: NominatimResult) => {
    const a = item.address || {};
    onSelect({
      address: item.display_name || value,
      city: a.city || a.town || a.village || a.municipality || a.county || '',
      region: a.state || a.region || a.state_district || '',
      latitude: item.lat ? Number(item.lat).toFixed(6) : '',
      longitude: item.lon ? Number(item.lon).toFixed(6) : '',
    });
    setOpen(false);
    setSuggestions([]);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight(h => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && highlight >= 0) {
      e.preventDefault();
      pick(suggestions[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <input
          id={id}
          type="text"
          required={required}
          value={value}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full px-4 py-3 pr-10 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
          {loading ? (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </span>
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-surface border border-border rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto animate-fade-in">
          {suggestions.map((s, i) => (
            <button
              key={`${s.lat}-${s.lon}-${i}`}
              type="button"
              onClick={() => pick(s)}
              onMouseEnter={() => setHighlight(i)}
              className={`w-full text-left px-4 py-2.5 flex items-start gap-2.5 transition-colors ${
                highlight === i ? 'bg-hover' : 'hover:bg-hover'
              }`}
            >
              <svg className="w-4 h-4 mt-0.5 text-text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm text-text-primary leading-snug">{s.display_name}</span>
            </button>
          ))}
          <p className="px-4 py-2 text-[11px] text-text-muted border-t border-border bg-card">
            Search powered by OpenStreetMap
          </p>
        </div>
      )}
    </div>
  );
}
