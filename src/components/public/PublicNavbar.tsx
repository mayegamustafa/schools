'use client';

import Link from 'next/link';
import { useState, useSyncExternalStore, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';

function useHasMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export default function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const hasMounted = useHasMounted();
  const { user, compareList } = useApp();
  const pathname = usePathname();

  const activeUser = hasMounted ? user : null;
  const isActive = (path: string) => pathname === path;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { href: '/', label: 'Home' },
    { href: '/search', label: 'Search' },
    { href: '/schools', label: 'Schools' },
    { href: '/compare', label: 'Compare' },
    { href: '/pricing', label: 'Pricing' },
  ];
  const accountHref = activeUser
    ? activeUser.role === 'admin'
      ? '/admin'
      : activeUser.role === 'school'
        ? '/dashboard'
        : '/messages'
    : '/auth/login';

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-shadow duration-300 glass-nav ${scrolled ? 'shadow-sm' : ''}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group" aria-label="SchoolFinder home">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary to-primary-dark shadow-sm transition-transform group-hover:scale-105">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <span className="text-lg font-semibold text-text-primary tracking-tight">
              School<span className="text-accent">Finder</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {links.map(link => (
              <Link key={link.href} href={link.href}
                className={`nav-underline px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? 'nav-active text-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}>
                {link.label}
                {link.href === '/compare' && compareList.length > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center min-w-5 h-5 px-1 text-xs bg-primary text-white rounded-full font-semibold">
                    {compareList.length}
                  </span>
                )}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2.5">
            {activeUser?.role === 'user' && (
              <Link href="/messages"
                className={`nav-underline px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/messages') ? 'nav-active text-primary' : 'text-text-secondary hover:text-text-primary'
                }`}>
                Messages
              </Link>
            )}
            <Link href="/schools/register"
              className="px-3.5 py-2 text-sm font-medium rounded-lg border border-border text-text-secondary hover:text-text-primary hover:border-primary/40 hover:bg-hover transition-all">
              List Your School
            </Link>
            {activeUser ? (
              <Link href={accountHref} className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border border-border hover:bg-hover transition-colors">
                <div className="w-7 h-7 rounded-full flex items-center justify-center bg-gradient-to-br from-primary to-primary-light">
                  <span className="text-xs font-semibold text-white">{activeUser.name[0]}</span>
                </div>
                <span className="text-sm font-medium text-text-primary">{activeUser.name.split(' ')[0]}</span>
              </Link>
            ) : (
              <Link href="/auth/login"
                className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors btn-press shadow-sm">
                Sign In
              </Link>
            )}
          </div>

          <button onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-md text-text-secondary hover:bg-hover transition-colors"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}>
            {mobileOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-surface border-t border-border animate-fade-in">
          <div className="px-4 py-4 space-y-1.5">
            {[
              ...links.map(link => ({
                ...link,
                label: link.href === '/compare' && compareList.length > 0
                  ? `Compare (${compareList.length})`
                  : link.label,
              })),
              ...(activeUser?.role === 'user' ? [{ href: '/messages', label: 'Messages' }] : []),
              { href: '/schools/register', label: 'List Your School' },
            ].map(link => (
              <Link key={link.href} href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-3.5 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.href) ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-hover'
                }`}>
                {link.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-border mt-2">
              {activeUser ? (
                <Link href={accountHref}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 px-3.5 py-3 rounded-lg text-sm font-medium text-text-secondary hover:bg-hover">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-white">{activeUser.name[0]}</span>
                  </div>
                  {activeUser.name}
                </Link>
              ) : (
                <Link href="/auth/login"
                  onClick={() => setMobileOpen(false)}
                  className="block w-full text-center px-3.5 py-3 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors">
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
