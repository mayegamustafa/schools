'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';

const ADMIN_NAV = [
  { href: '/admin', label: 'Overview', exact: true },
  { href: '/admin/schools', label: 'Schools' },
  { href: '/admin/payments', label: 'Payments' },
  { href: '/admin/plans', label: 'Plans' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/reports', label: 'Reports' },
  { href: '/admin/support', label: 'Support' },
  { href: '/admin/audit', label: 'Audit Log' },
  { href: '/admin/settings', label: 'Settings' },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, token, logout, showToast } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!token || !user) {
      router.push('/auth/login');
      return;
    }

    if (user.role !== 'admin') {
      router.push('/');
    }
  }, [token, user, router]);

  const handleLogout = async () => {
    await logout();
    showToast('Signed out', 'info');
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {mobileOpen && (
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          aria-label="Close navigation"
        />
      )}

      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-surface border-r border-border transform transition-transform md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-14 px-4 flex items-center border-b border-border">
          <Link href="/" className="flex items-center gap-2.5 font-semibold text-text-primary group">
            <span className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary to-primary-dark shadow-sm transition-transform group-hover:scale-105">
              <svg className="w-[18px] h-[18px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </span>
            <span className="text-sm">School<span className="text-accent">Finder</span> <span className="text-text-muted font-normal">Admin</span></span>
          </Link>
        </div>

        <nav className="p-2 space-y-1">
          {ADMIN_NAV.map(item => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`relative block px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-hover hover:text-text-primary'}`}
              >
                {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-primary" />}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-border">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full px-3 py-2 rounded-xl text-sm font-medium border border-border text-text-secondary hover:text-error hover:bg-hover transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 min-h-screen flex flex-col md:ml-0">
        <header className="sticky top-0 z-30 h-14 glass-nav flex items-center justify-between px-4">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 rounded-lg text-text-secondary hover:bg-hover"
            aria-label="Open navigation"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <p className="text-sm font-medium text-text-primary">Admin Dashboard</p>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-light text-white text-xs font-semibold flex items-center justify-center shadow-sm">
            {user?.name?.[0]?.toUpperCase() || 'A'}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
