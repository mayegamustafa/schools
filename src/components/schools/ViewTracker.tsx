'use client';

import { useEffect } from 'react';

/**
 * Fire-and-forget view beacon for a school profile.
 *
 * Deliberately silent: analytics must never surface an error to a parent
 * browsing schools. Deduplication happens server-side, so a refresh or a
 * back-navigation does not inflate the count.
 */
export default function ViewTracker({ schoolId }: { schoolId: string }) {
  useEffect(() => {
    const controller = new AbortController();

    void fetch(`/api/schools/${schoolId}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'profile',
        referrer: document.referrer || null,
      }),
      signal: controller.signal,
      keepalive: true,
    }).catch(() => {});

    return () => controller.abort();
  }, [schoolId]);

  return null;
}

/** Records a contact action (phone, WhatsApp, website). */
export function trackContact(schoolId: string) {
  void fetch(`/api/schools/${schoolId}/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'contact', referrer: document.referrer || null }),
    keepalive: true,
  }).catch(() => {});
}
