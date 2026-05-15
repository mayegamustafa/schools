'use client';

import { useApp } from '@/context/AppContext';

export default function Toast() {
  const { toast } = useApp();

  if (!toast) return null;

  const bgColor = {
    success: 'bg-secondary',
    error: 'bg-error',
    info: 'bg-primary',
  }[toast.type] || 'bg-primary';

  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className={`${bgColor} text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 max-w-sm`}>
        {toast.type === 'success' && (
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
        {toast.type === 'error' && (
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        {toast.message}
      </div>
    </div>
  );
}
