'use client';

import { createContext, useContext } from 'react';
import { DEFAULT_SITE_CONTENT } from '@/lib/site-defaults';
import type { SiteContent } from '@/lib/site-defaults';

export type {
  NavLink,
  FooterLink,
  FooterColumn,
  HowItWorksStep,
  SiteContent,
} from '@/lib/site-defaults';

const SiteContentContext = createContext<SiteContent>(DEFAULT_SITE_CONTENT);

export function SiteContentProvider({
  children,
  initialData,
}: {
  children: React.ReactNode;
  initialData: SiteContent;
}) {
  return (
    <SiteContentContext.Provider value={initialData}>
      {children}
    </SiteContentContext.Provider>
  );
}

export function useSiteContent(): SiteContent {
  return useContext(SiteContentContext);
}
