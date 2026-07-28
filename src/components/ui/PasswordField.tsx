'use client';

import { useId, useState } from 'react';

export const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

/** bcrypt silently ignores anything past 72 bytes, so reject it rather than
 *  accepting a password whose tail never gets hashed. */
export const PASSWORD_MAX_LENGTH = 72;

export interface PasswordCheck {
  label: string;
  met: boolean;
}

export function checkPassword(value: string): PasswordCheck[] {
  return [
    { label: 'At least 8 characters', met: value.length >= 8 },
    { label: 'One lowercase letter', met: /[a-z]/.test(value) },
    { label: 'One uppercase letter', met: /[A-Z]/.test(value) },
    { label: 'One number', met: /\d/.test(value) },
  ];
}

export function passwordProblem(password: string, confirm: string): string | null {
  if (!password) return 'Please choose a password';
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer`;
  }
  if (!PASSWORD_RULE.test(password)) {
    return 'Password needs 8+ characters with an uppercase letter, a lowercase letter, and a number';
  }
  if (password !== confirm) return 'Passwords do not match';
  return null;
}

interface Props {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: 'new-password' | 'current-password';
  required?: boolean;
  /** Shown in red beneath the field once the user has interacted with it. */
  error?: string | null;
  name?: string;
}

/**
 * Password input with a reveal toggle. Typing a password blind into a small
 * phone keyboard is the single biggest source of drop-off in the school
 * registration flow, so every password field on the site uses this.
 */
export default function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete = 'new-password',
  required,
  error,
  name,
}: Props) {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const [visible, setVisible] = useState(false);
  const errorId = `${fieldId}-error`;

  return (
    <div>
      <label htmlFor={fieldId} className="block text-sm font-medium text-text-primary mb-2">
        {label}
      </label>
      <div className="relative">
        <input
          id={fieldId}
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          required={required}
          autoComplete={autoComplete}
          maxLength={PASSWORD_MAX_LENGTH}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`w-full px-4 py-3 pr-12 border rounded-xl text-sm bg-surface outline-none transition-colors focus:ring-2 focus:ring-primary/20 ${
            error ? 'border-error focus:border-error' : 'border-border focus:border-primary'
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-hover transition-colors"
        >
          {visible ? (
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.7 16.7A9.5 9.5 0 0112 18c-5 0-9-6-9-6a17 17 0 014.1-4.7m3.2-1.6A9.5 9.5 0 0112 6c5 0 9 6 9 6a17 17 0 01-2.4 3.1" />
            </svg>
          ) : (
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12S6.5 6 12 6s9.5 6 9.5 6-4 6-9.5 6-9.5-6-9.5-6z" />
              <circle cx="12" cy="12" r="2.5" />
            </svg>
          )}
        </button>
      </div>
      {error && (
        <p id={errorId} className="text-xs text-error mt-1.5">{error}</p>
      )}
    </div>
  );
}

/** Live checklist so the rules are visible while typing, not after a failed submit. */
export function PasswordChecklist({ value }: { value: string }) {
  const checks = checkPassword(value);

  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2" aria-live="polite">
      {checks.map(check => (
        <li
          key={check.label}
          className={`flex items-center gap-1.5 text-xs transition-colors ${
            check.met ? 'text-success' : 'text-text-muted'
          }`}
        >
          <span
            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold ${
              check.met ? 'bg-success text-white' : 'bg-border text-transparent'
            }`}
            aria-hidden="true"
          >
            ✓
          </span>
          {check.label}
        </li>
      ))}
    </ul>
  );
}
