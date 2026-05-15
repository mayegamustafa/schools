'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';

const ADMIN_NAV = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/schools', label: 'Schools' },
  { href: '/admin/payments', label: 'Payments' },
  { href: '/admin/plans', label: 'Plans' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/reports', label: 'Reports' },
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
          <Link href="/" className="font-semibold text-text-primary hover:text-primary transition-colors">
            SchoolFinder Admin
          </Link>
        </div>

        <nav className="p-2 space-y-1">
          {ADMIN_NAV.map(item => {
            const isActive = item.href === '/admin'
              ? pathname === '/admin'
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-hover hover:text-text-primary'}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-border">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full px-3 py-2 rounded-lg text-sm font-medium border border-border text-text-secondary hover:text-error hover:bg-hover transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 min-h-screen flex flex-col md:ml-0">
        <header className="h-14 bg-surface border-b border-border flex items-center justify-between px-4">
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
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
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
