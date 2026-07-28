'use client';

import { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode, useSyncExternalStore } from 'react';
import { User, SearchFilters } from '@/types';

interface AppState {
  user: User | null;
  token: string | null;
  favorites: string[];
  compareList: string[];
  searchFilters: SearchFilters;
  isSearchOpen: boolean;
}

interface AppContextType extends AppState {
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => Promise<void>;
  toggleFavorite: (schoolId: string) => void;
  addToCompare: (schoolId: string) => void;
  removeFromCompare: (schoolId: string) => void;
  clearCompare: () => void;
  setSearchFilters: (filters: Partial<SearchFilters>) => void;
  resetSearchFilters: () => void;
  setIsSearchOpen: (open: boolean) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  toast: { message: string; type: string } | null;
}

const defaultFilters: SearchFilters = {
  query: '',
  sortBy: 'relevance',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const authListeners = new Set<() => void>();

function subscribeToAuth(callback: () => void) {
  authListeners.add(callback);
  return () => authListeners.delete(callback);
}

function emitAuthChange() {
  authListeners.forEach(listener => listener());
}

function normalizeRole(role: string | undefined): User['role'] {
  if (role === 'admin') return 'admin';
  if (role === 'school' || role === 'school_admin') return 'school';
  if (role === 'guest') return 'guest';
  return 'user';
}

const readStoredUser = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('sf_user');
};

function parseStoredUser(storedUser: string | null): User | null {
  if (!storedUser) return null;

  try {
    const parsed = JSON.parse(storedUser) as User;
    return {
      ...parsed,
      role: normalizeRole(parsed.role),
    };
  } catch {
    localStorage.removeItem('sf_user');
    return null;
  }
};

/**
 * Opaque marker meaning "this browser has a session".
 *
 * The JWT itself lives only in the httpOnly `sf_token` cookie and is never
 * readable by JavaScript. It used to be mirrored into localStorage as well,
 * which meant the cookie's XSS protection bought nothing — any injected script
 * could lift the token and impersonate the user. Requests now authenticate with
 * the cookie automatically; this value only gates UI and SWR keys.
 */
const SESSION_MARKER = 'active';

const readStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  // Presence of the cached user implies a session cookie was issued alongside it.
  return localStorage.getItem('sf_user') ? SESSION_MARKER : null;
};

export function AppProvider({ children }: { children: ReactNode }) {
  const storedUser = useSyncExternalStore(subscribeToAuth, readStoredUser, () => null);
  const token = useSyncExternalStore(subscribeToAuth, readStoredToken, () => null);
  // Memoised on the raw string: re-parsing on every render produced a new object
  // identity each time, which changed the context value and re-rendered every
  // consumer in the tree.
  const user = useMemo(() => parseStoredUser(storedUser), [storedUser]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [compareList, setCompareList] = useState<string[]>([]);
  const [searchFilters, setSearchFiltersState] = useState<SearchFilters>(defaultFilters);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  const setUser = useCallback((nextUser: User | null) => {
    if (typeof window === 'undefined') return;

    if (!nextUser) {
      localStorage.removeItem('sf_user');
      emitAuthChange();
      return;
    }

    const normalizedUser = {
      ...nextUser,
      role: normalizeRole(nextUser.role),
    };

    localStorage.setItem('sf_user', JSON.stringify(normalizedUser));
    emitAuthChange();
  }, []);

  /**
   * Kept for call-site compatibility, but the JWT is deliberately discarded —
   * the server already set it as an httpOnly cookie on the same response.
   */
  const setToken = useCallback((nextToken: string | null) => {
    if (typeof window === 'undefined') return;

    // Clear any token left in localStorage by an older build.
    localStorage.removeItem('sf_token');
    if (!nextToken) localStorage.removeItem('sf_user');

    emitAuthChange();
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
    } catch {
      // Local state still gets cleared even if server-side logout fails.
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem('sf_user');
      localStorage.removeItem('sf_token');
      emitAuthChange();
    }

    setFavorites([]);
    setCompareList([]);
    setSearchFiltersState(defaultFilters);
    setIsSearchOpen(false);
  }, []);

  // Hydrate saved schools from the account. They were previously component state
  // only, so every refresh silently wiped them despite User.favorites existing.
  useEffect(() => {
    if (!token) return;

    let active = true;
    fetch('/api/users')
      .then(res => {
        // The cached user in localStorage outlives the 24h session cookie, so a
        // returning visitor looked signed in while every request 401'd. Clearing
        // it here returns the UI to a signed-out state instead.
        if (res.status === 401) {
          if (active) localStorage.removeItem('sf_user');
          emitAuthChange();
          return null;
        }
        return res.ok ? res.json() : null;
      })
      .then(data => {
        if (active && Array.isArray(data?.user?.favorites)) setFavorites(data.user.favorites);
      })
      .catch(() => {});

    return () => { active = false; };
  }, [token]);

  const toggleFavorite = useCallback((schoolId: string) => {
    setFavorites(prev => {
      const next = prev.includes(schoolId)
        ? prev.filter(id => id !== schoolId)
        : [...prev, schoolId];

      // Optimistic locally, persisted in the background; a failed write just
      // means the list reverts on next load rather than blocking the tap.
      void fetch('/api/users/favorites', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorites: next }),
      }).catch(() => {});

      return next;
    });
  }, []);

  const addToCompare = useCallback((schoolId: string) => {
    setCompareList(prev => {
      if (prev.includes(schoolId)) return prev;
      if (prev.length >= 4) return prev;
      return [...prev, schoolId];
    });
  }, []);

  const removeFromCompare = useCallback((schoolId: string) => {
    setCompareList(prev => prev.filter(id => id !== schoolId));
  }, []);

  const clearCompare = useCallback(() => setCompareList([]), []);

  const setSearchFilters = useCallback((filters: Partial<SearchFilters>) => {
    setSearchFiltersState(prev => ({ ...prev, ...filters }));
  }, []);

  const resetSearchFilters = useCallback(() => {
    setSearchFiltersState(defaultFilters);
  }, []);

  const showToast = useCallback((message: string, type: string = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  return (
    <AppContext.Provider value={{
      user, token, favorites, compareList, searchFilters, isSearchOpen, toast,
      setUser, setToken, logout, toggleFavorite, addToCompare, removeFromCompare, clearCompare,
      setSearchFilters, resetSearchFilters, setIsSearchOpen, showToast,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
