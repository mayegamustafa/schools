'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SearchBarProps {
  large?: boolean;
  initialQuery?: string;
  className?: string;
  variant?: 'default' | 'hero';
}

export default function SearchBar({ large = false, initialQuery = '', className = '', variant = 'default' }: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    if (value.length > 1) {
      fetch(`/api/schools?q=${encodeURIComponent(value)}&limit=5`)
        .then(res => res.json())
        .then(data => {
          const matches = (data.schools || []).map((s: { name: string }) => s.name);
          setSuggestions(matches);
          setShowSuggestions(matches.length > 0);
        })
        .catch(() => {
          setSuggestions([]);
          setShowSuggestions(false);
        });
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSubmit = (searchQuery?: string) => {
    const q = searchQuery || query;
    if (q.trim()) {
      router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      setShowSuggestions(false);
    }
  };

  const handleNearMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          router.push(`/search?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}&near=1`);
        },
        () => {
          router.push('/search');
        }
      );
    }
  };

  const isHero = variant === 'hero';

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className={`flex items-center rounded-xl transition-colors border ${
        focused ? 'border-primary shadow-md bg-surface' : 'border-border bg-surface'
      } ${large || isHero ? 'p-2.5' : 'p-2'}`}>
        <div className="flex items-center flex-1 gap-2.5 px-3">
          <svg className={`shrink-0 transition-colors ${focused ? 'text-primary' : 'text-text-muted'} ${large || isHero ? 'w-5 h-5' : 'w-4.5 h-4.5'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => handleChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            onFocus={() => {
              setFocused(true);
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            placeholder="Search schools by name, location, or type..."
            className={`flex-1 bg-transparent outline-none text-text-primary placeholder:text-text-muted ${large || isHero ? 'text-base py-1.5' : 'text-sm py-1'}`}
          />
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
            onClick={() => handleSubmit()}
            className={`bg-primary text-white font-medium rounded-md hover:bg-primary-dark transition-colors btn-press ${large || isHero ? 'px-5 py-2.5 text-sm' : 'px-4 py-2 text-sm'}`}
          >
            Search
          </button>
        </div>
      </div>

      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface rounded-lg border border-border shadow-lg overflow-hidden z-50 animate-fade-in">
          {suggestions.map((suggestion, i) => (
            <button
              key={i}
              onClick={() => { setQuery(suggestion); handleSubmit(suggestion); }}
              className="w-full px-4 py-3 text-left text-sm text-text-primary hover:bg-hover flex items-center gap-2.5 transition-colors"
            >
              <svg className="w-4 h-4 text-text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="font-medium">{suggestion}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
