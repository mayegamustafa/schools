'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';

interface Props {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  /** Attach to an existing school; omit during registration. */
  schoolId?: string;
  kind: 'logo' | 'cover' | 'gallery';
  token: string | null;
  required?: boolean;
  error?: string | null;
  /** Square preview for badges, 16:9 for covers. */
  shape?: 'square' | 'wide';
}

const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Upload-with-preview control used by both the registration flow and the school
 * profile editor. Uploads immediately and hands back the hosted URL, so the
 * parent form only ever stores a string.
 */
export default function ImageUploadField({
  label, hint, value, onChange, schoolId, kind, token, required, error, shape = 'wide',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setLocalError(null);

    if (!ACCEPTED.includes(file.type)) {
      setLocalError('Use a JPG, PNG, or WebP image');
      return;
    }
    if (file.size > MAX_SIZE) {
      setLocalError('Image must be 5 MB or smaller');
      return;
    }
    if (!token) {
      setLocalError('Please finish creating your account first');
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('kind', kind);
      if (schoolId) body.append('schoolId', schoolId);

      const res = await fetch('/api/uploads', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      onChange(data.url);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      // Allow re-picking the same file after a failure.
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const shownError = error || localError;
  const isSquare = shape === 'square';

  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-2">
        {label} {required && <span className="text-error">*</span>}
      </label>

      <div
        className={`relative overflow-hidden rounded-xl border-2 border-dashed transition-colors ${
          shownError ? 'border-error' : value ? 'border-primary/30' : 'border-border hover:border-primary/40'
        } ${isSquare ? 'w-32 h-32' : 'w-full aspect-video'}`}
      >
        {value ? (
          <>
            <Image
              src={value}
              alt={`${label} preview`}
              fill
              sizes={isSquare ? '128px' : '(max-width: 768px) 100vw, 640px'}
              className={isSquare ? 'object-contain p-2' : 'object-cover'}
            />
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
              aria-label={`Remove ${label}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-text-muted hover:text-text-secondary transition-colors disabled:opacity-60"
          >
            {uploading ? (
              <>
                <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
                </svg>
                <span className="text-xs">Uploading…</span>
              </>
            ) : (
              <>
                <svg className={isSquare ? 'w-6 h-6' : 'w-8 h-8'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16l5-5 4 4 3-3 6 6M5 5h14a1 1 0 011 1v12a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" />
                </svg>
                <span className="text-xs font-medium">Tap to upload</span>
              </>
            )}
          </button>
        )}
      </div>

      {value && !uploading && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-xs text-primary font-medium mt-2 hover:text-primary-dark"
        >
          Replace image
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      {shownError
        ? <p className="text-xs text-error mt-1.5">{shownError}</p>
        : hint && <p className="text-xs text-text-muted mt-1.5">{hint}</p>}
    </div>
  );
}
