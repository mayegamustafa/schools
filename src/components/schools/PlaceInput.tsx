'use client';

import { useState, useRef, useEffect, useId } from 'react';

interface Props {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** Called when a suggestion is picked, so the caller can fill related fields. */
  onPick?: (value: string) => void;
  /** Returns suggestions for the current text. */
  suggest: (query: string) => string[];
  placeholder?: string;
  required?: boolean;
  className?: string;
  /** Shown when the field is focused and empty. */
  emptyHint?: string;
  ariaLabel?: string;
}

/**
 * Text input that suggests from a known list as you type.
 *
 * Used for city and region on the registration and profile forms. Values are
 * not *restricted* to the list — a school in a place we haven't catalogued must
 * still be able to register — but matching entries are offered first so most
 * listings converge on consistent, filterable names.
 */
export default function PlaceInput({
  id, value, onChange, onPick, suggest, placeholder, required, className, emptyHint, ariaLabel,
}: Props) {
  const generatedId = useId();
  const fieldId = id || generatedId;

  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);

  const suggestions = open ? suggest(value) : [];

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const pick = (next: string) => {
    onChange(next);
    onPick?.(next);
    setOpen(false);
    setHighlight(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) {
      // Let the field reopen after Escape without retyping.
      if (e.key === 'ArrowDown') setOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight(h => (h + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => (h <= 0 ? suggestions.length - 1 : h - 1));
    } else if (e.key === 'Enter' && highlight >= 0) {
      // Only intercept Enter when a suggestion is actively highlighted, so it
      // doesn't block submitting the form.
      e.preventDefault();
      pick(suggestions[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setHighlight(-1);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <input
        id={fieldId}
        type="text"
        value={value}
        required={required}
        autoComplete="off"
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={open && suggestions.length > 0}
        role="combobox"
        aria-controls={`${fieldId}-options`}
        onChange={e => {
          onChange(e.target.value);
          setOpen(true);
          setHighlight(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={className}
      />

      {open && suggestions.length > 0 && (
        <div
          id={`${fieldId}-options`}
          role="listbox"
          className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-surface border border-border rounded-xl shadow-lg overflow-hidden max-h-56 overflow-y-auto animate-fade-in"
        >
          {suggestions.map((suggestion, i) => (
            <button
              key={suggestion}
              type="button"
              role="option"
              aria-selected={highlight === i}
              onClick={() => pick(suggestion)}
              onMouseEnter={() => setHighlight(i)}
              className={`w-full text-left px-4 py-2.5 flex items-center gap-2.5 transition-colors ${
                highlight === i ? 'bg-hover' : 'hover:bg-hover'
              }`}
            >
              <svg className="w-4 h-4 text-text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm text-text-primary">{suggestion}</span>
            </button>
          ))}
        </div>
      )}

      {open && suggestions.length === 0 && value.trim() === '' && emptyHint && (
        <p className="absolute z-40 top-full left-0 mt-1 text-xs text-text-muted">{emptyHint}</p>
      )}
    </div>
  );
}
