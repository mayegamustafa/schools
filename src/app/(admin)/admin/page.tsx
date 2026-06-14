'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { useApp } from '@/context/AppContext';
import { formatCurrency, formatNumber } from '@/utils/helpers';
import { BuildingOfficeIcon, UserGroupSmallIcon, StarIcon, ShieldCheckIcon, CurrencyIcon, TrophyIcon } from '@/components/ui/Icons';

interface AdminOverviewResponse {
  stats: {
    totalSchools: number;
    totalUsers: number;
    totalReviews: number;
    pendingApprovals: number;
    flaggedReviews: number;
    activeSubscriptions: number;
    totalRevenue: number;
  };
  pendingSchools: Array<{
    id: string;
    slug: string;
    name: string;
    city: string;
    country: string;
    createdAt: string;
  }>;
}

const fetcher = async ([url, token]: [string, string]) => {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await res.json();
  if (!res.ok) throw new Error(payload.error || 'Failed to load admin overview');
  return payload as AdminOverviewResponse;
};

export default function AdminOverviewPage() {
  const { token } = useApp();

  const { data, error, isLoading } = useSWR(
    token ? ['/api/admin/overview', token] : null,
    fetcher,
    { refreshInterval: 30000 }
  );

  if (!token) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <h1 className="text-2xl font-bold text-text-primary mb-3">Admin access required</h1>
        <p className="text-text-secondary">Sign in with an admin account to access platform controls.</p>
      </div>
    );
  }

  if (isLoading && !data) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="skeleton h-9 w-56 rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="skeleton h-64 rounded-2xl" />
          <div className="skeleton h-64 rounded-2xl" />
        </div>
      </div>
    );
  }
  if (error || !data) return <p className="text-error">{error instanceof Error ? error.message : 'Unable to load admin overview'}</p>;

  const statCards = [
    { label: 'Total Schools', value: formatNumber(data.stats.totalSchools), icon: <BuildingOfficeIcon className="w-5 h-5 text-primary" /> },
    { label: 'Total Users', value: formatNumber(data.stats.totalUsers), icon: <UserGroupSmallIcon className="w-5 h-5 text-primary" /> },
    { label: 'Total Reviews', value: formatNumber(data.stats.totalReviews), icon: <StarIcon className="w-5 h-5 text-primary" /> },
    { label: 'Pending Approvals', value: formatNumber(data.stats.pendingApprovals), icon: <ShieldCheckIcon className="w-5 h-5 text-warning" />, accent: true },
    { label: 'Active Subscriptions', value: formatNumber(data.stats.activeSubscriptions), icon: <TrophyIcon className="w-5 h-5 text-primary" /> },
    { label: 'Total Revenue', value: formatCurrency(data.stats.totalRevenue), icon: <CurrencyIcon className="w-5 h-5 text-success" /> },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Admin Overview</h1>
        <p className="text-text-secondary mt-1">Live platform health and moderation snapshot.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map(card => (
          <div key={card.label} className="group bg-surface rounded-2xl border border-border p-5 lift">
            <div className="flex items-center justify-between mb-3">
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${card.accent ? 'bg-warning/10' : 'bg-primary/8 group-hover:bg-primary/15'}`}>{card.icon}</span>
            </div>
            <p className="text-2xl font-bold text-text-primary tracking-tight">{card.value}</p>
            <p className="text-xs text-text-muted uppercase tracking-wider mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary">Pending School Approvals</h2>
            <Link href="/admin/schools" className="text-sm text-primary hover:underline">Manage schools</Link>
          </div>
          {data.pendingSchools.length === 0 ? (
            <p className="text-sm text-text-secondary">No pending schools right now.</p>
          ) : (
            <div className="space-y-3">
              {data.pendingSchools.map(school => (
                <div key={school.id} className="py-3 border-b border-border last:border-0">
                  <p className="text-sm font-medium text-text-primary">{school.name}</p>
                  <p className="text-xs text-text-secondary">{school.city}, {school.country}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface rounded-2xl border border-border p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link href="/admin/schools" className="px-4 py-3 rounded-xl border border-border hover:bg-hover text-sm font-medium text-text-primary">
              Review Schools
            </Link>
            <Link href="/admin/payments" className="px-4 py-3 rounded-xl border border-border hover:bg-hover text-sm font-medium text-text-primary">
              Monitor Payments
            </Link>
            <Link href="/admin/users" className="px-4 py-3 rounded-xl border border-border hover:bg-hover text-sm font-medium text-text-primary">
              Manage Users
            </Link>
            <Link href="/admin/reports" className="px-4 py-3 rounded-xl border border-border hover:bg-hover text-sm font-medium text-text-primary">
              Review Reports
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
