'use client';

import { useEffect, useState } from 'react';
import { BANNER_DISMISSED_KEY } from '@/lib/mobile-app';

export default function AppInstallBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(BANNER_DISMISSED_KEY)) return;
    if (/Android/.test(navigator.userAgent)) setShow(true);
  }, []);

  function handleDismiss() {
    localStorage.setItem(BANNER_DISMISSED_KEY, '1');
    setShow(false);
  }

  function handleGet() {
    window.location.href = '/api/app/download';
  }

  if (!show) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[60] h-[52px] flex items-center px-3 gap-3 border-t border-white/10 animate-[fade-in_0.25s_ease]"
      style={{ backgroundColor: 'var(--color-primary)' }}
    >
      {/* App icon */}
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold leading-tight truncate" style={{ color: 'white' }}>SchoolFinder</p>
        <p className="text-[11px] leading-tight truncate" style={{ color: 'rgba(255,255,255,0.65)' }}>
          Free · Direct install
        </p>
      </div>

      {/* CTA */}
      <button
        onClick={handleGet}
        className="shrink-0 px-3.5 py-1.5 text-[13px] font-semibold rounded-full transition-opacity hover:opacity-90 active:opacity-75"
        style={{ backgroundColor: 'white', color: 'var(--color-primary)' }}
      >
        Get
      </button>

      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        aria-label="Dismiss app banner"
        className="shrink-0 p-1.5 -mr-1 transition-opacity hover:opacity-100"
        style={{ color: 'rgba(255,255,255,0.55)' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
