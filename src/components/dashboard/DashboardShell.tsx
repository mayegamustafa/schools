'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';

interface SchoolInfo {
  id: string;
  name: string;
  status: string;
  isVerified: boolean;
}

interface Notif {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const NAV = [
  {
    href: '/dashboard',
    label: 'Overview',
    exact: true,
    icon: (
      <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/profile',
    label: 'School Profile',
    icon: (
      <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2M5 21H3"/>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6M9 11h6M9 15h4"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/leads',
    label: 'Leads & Inquiries',
    icon: (
      <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/reviews',
    label: 'Reviews',
    icon: (
      <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/messages',
    label: 'Messages',
    icon: (
      <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5"/>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 4h10a3 3 0 013 3v6a3 3 0 01-3 3h-4l-4 4v-4H7a3 3 0 01-3-3V7a3 3 0 013-3z"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/analytics',
    label: 'Analytics',
    icon: (
      <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/subscription',
    label: 'Subscription',
    icon: (
      <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
      </svg>
    ),
  },
];

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const { token, user, logout, showToast } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [school, setSchool] = useState<SchoolInfo | null>(null);
  const [schoolToken, setSchoolToken] = useState<string | null>(null);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !token) { router.push('/auth/login'); return; }
    if (user.role !== 'school') { router.push('/'); return; }

    fetch('/api/dashboard/info', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
      .then(r => r.json())
      .then(d => {
        if (d.id) {
          setSchool(d as SchoolInfo);
          setSchoolToken(token);
        }
      })
      .catch(() => {});

    fetch('/api/notifications', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
      .then(r => r.json())
      .then(d => { setNotifs(d.notifications || []); setUnread(d.unreadCount || 0); })
      .catch(() => {});
  }, [user, token, router]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');

  const markAllRead = async () => {
    if (!token) return;
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAll: true }),
    });
    setUnread(0);
    setNotifs(p => p.map(n => ({ ...n, isRead: true })));
    setNotifOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    showToast('Signed out', 'info');
    router.push('/');
  };

  const activeSchool = schoolToken === token ? school : null;

  const SidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo / Header */}
      <div className="flex items-center justify-between h-14 px-3 border-b border-border flex-shrink-0">
        {open ? (
          <Link href="/" className="flex items-center gap-2 text-text-primary font-semibold text-sm hover:text-primary transition-colors">
            <svg className="w-5 h-5 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            SchoolFinder
          </Link>
        ) : (
          <Link href="/" className="w-7 h-7 mx-auto flex items-center justify-center text-primary">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </Link>
        )}
        <button
          onClick={() => setOpen(v => !v)}
          className="hidden md:flex p-1.5 rounded-md text-text-muted hover:bg-hover hover:text-text-primary transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {open
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/>
              : <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7"/>}
          </svg>
        </button>
      </div>

      {/* School info */}
      {open && activeSchool && (
        <div className="px-3 py-3 border-b border-border">
          <p className="text-xs font-semibold text-text-primary truncate">{activeSchool.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${activeSchool.status === 'approved' || activeSchool.status === 'active' ? 'bg-success' : 'bg-accent'}`}/>
            <span className="text-xs text-text-muted capitalize">{activeSchool.status}</span>
            {activeSchool.isVerified && <span className="text-xs text-success font-medium">· Verified</span>}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {NAV.map(item => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              title={!open ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors ${!open ? 'justify-center' : ''} ${active ? 'bg-primary/8 text-primary' : 'text-text-secondary hover:bg-hover hover:text-text-primary'}`}
            >
              {item.icon}
              {open && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-2 space-y-1 flex-shrink-0">
        {open && activeSchool && (
          <Link
            href={`/schools/${activeSchool.id}`}
            target="_blank"
            className="flex items-center gap-2 px-3 py-2 text-xs text-text-muted hover:text-primary rounded-md hover:bg-hover transition-colors"
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
            View Public Profile
          </Link>
        )}
        <button
          onClick={handleLogout}
          title={!open ? 'Sign out' : undefined}
          className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-text-muted hover:text-error rounded-md hover:bg-hover transition-colors ${!open ? 'justify-center' : ''}`}
        >
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
          {open && 'Sign out'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — desktop fixed, mobile drawer */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 bg-surface border-r border-border flex flex-col transition-all duration-200
        md:${open ? 'w-56' : 'w-14'}
        ${mobileOpen ? 'w-64 translate-x-0' : '-translate-x-full md:translate-x-0'}
        w-64
      `}
        style={{ width: undefined }}
      >
        <div className={`h-full flex flex-col ${!open ? 'md:w-14' : 'md:w-56'} w-64`}>
          {SidebarContent}
        </div>
      </aside>

      {/* Main area */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-200 ${open ? 'md:ml-56' : 'md:ml-14'}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-14 bg-surface border-b border-border flex items-center justify-between px-4 md:px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-1.5 rounded-md text-text-muted hover:bg-hover transition-colors"
              onClick={() => setMobileOpen(v => !v)}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
            <div className="flex items-center gap-2">
              {school ? (
                <>
                  <span className="text-sm font-semibold text-text-primary truncate max-w-[200px]">{school.name}</span>
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${school.status === 'approved' || school.status === 'active' ? 'bg-success' : 'bg-accent'}`}/>
                </>
              ) : (
                <span className="text-sm font-semibold text-text-primary">School Dashboard</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(v => !v)}
                className="relative p-2 rounded-lg hover:bg-hover text-text-secondary transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                </svg>
                {unread > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-error text-white text-[10px] rounded-full flex items-center justify-center font-bold leading-none">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full mt-1 w-80 bg-surface border border-border rounded-xl shadow-xl z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <span className="text-sm font-semibold text-text-primary">Notifications</span>
                    {unread > 0 && (
                      <button onClick={markAllRead} className="text-xs text-primary hover:underline">Mark all read</button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-border">
                    {notifs.length === 0 ? (
                      <p className="p-4 text-sm text-text-muted text-center">No notifications</p>
                    ) : notifs.map(n => (
                      <div key={n.id} className={`px-4 py-3 ${n.isRead ? '' : 'bg-primary/3'}`}>
                        <p className="text-xs font-semibold text-text-primary">{n.title}</p>
                        <p className="text-xs text-text-muted mt-0.5">{n.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User avatar */}
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
