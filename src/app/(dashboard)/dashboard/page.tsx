'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { useApp } from '@/context/AppContext';
import { formatCurrency, formatNumber } from '@/utils/helpers';
import { EyeIcon, CursorClickIcon, ChatBubbleIcon } from '@/components/ui/Icons';

interface DashboardResponse {
  school: {
    id: string;
    name: string;
    description: string;
    shortDescription: string;
    phone: string;
    email: string;
    website?: string | null;
    address: string;
    city: string;
    region: string;
    country: string;
  };
  stats: {
    totalViews: number;
    totalClicks: number;
    totalMessages: number;
    viewsTrend: number;
    clicksTrend: number;
    messagesTrend: number;
  };
  recentActivity: Array<{
    type: string;
    message: string;
    time: string;
  }>;
  subscription: {
    planName: string;
    amount: number;
    currency: string;
    period: string;
    status: string;
    nextBillingDate: string | null;
  } | null;
  paymentHistory: Array<{
    date: string;
    amount: number;
    status: string;
  }>;
}

const fetcher = async ([url, token]: [string, string]) => {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload.error || 'Failed to load dashboard');
  }

  return payload as DashboardResponse;
};

export default function DashboardOverviewPage() {
  const { token } = useApp();
  const { data, error, isLoading } = useSWR(
    token ? ['/api/dashboard', token] : null,
    fetcher,
    { refreshInterval: 30000 }
  );

  if (!token) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-text-primary mb-3">Dashboard access requires sign in</h1>
        <p className="text-text-secondary">Sign in with a school account to manage your listing.</p>
      </div>
    );
  }

  if (isLoading && !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center text-text-secondary">
        Loading school dashboard...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-text-primary mb-3">Unable to load dashboard</h1>
        <p className="text-text-secondary">{error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Profile Views',
      value: data.stats.totalViews,
      trend: data.stats.viewsTrend,
      icon: <EyeIcon className="w-6 h-6 text-primary" />,
    },
    {
      label: 'Link Clicks',
      value: data.stats.totalClicks,
      trend: data.stats.clicksTrend,
      icon: <CursorClickIcon className="w-6 h-6 text-primary" />,
    },
    {
      label: 'Leads',
      value: data.stats.totalMessages,
      trend: data.stats.messagesTrend,
      icon: <ChatBubbleIcon className="w-6 h-6 text-primary" />,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">School Dashboard</h1>
          <p className="text-text-secondary mt-1">Live listing performance and account status.</p>
        </div>
        <Link
          href={`/schools/${data.school.id}`}
          className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-gray-50 transition-colors self-start"
        >
          View Public Profile
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        {statCards.map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <span>{stat.icon}</span>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${stat.trend >= 0 ? 'bg-secondary/10 text-secondary' : 'bg-error/10 text-error'}`}>
                {stat.trend >= 0 ? '+' : ''}{stat.trend}%
              </span>
            </div>
            <p className="text-2xl font-bold text-text-primary">{formatNumber(stat.value)}</p>
            <p className="text-sm text-text-muted mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-border p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Recent Activity</h2>
          {data.recentActivity.length === 0 ? (
            <p className="text-sm text-text-secondary">No recent activity yet.</p>
          ) : (
            <div className="space-y-3">
              {data.recentActivity.map((activity, idx) => (
                <div key={`${activity.type}-${idx}`} className="flex items-start justify-between gap-3 py-2 border-b border-border last:border-0">
                  <p className="text-sm text-text-primary">{activity.message}</p>
                  <span className="text-xs text-text-muted shrink-0">{activity.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-border p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Subscription Snapshot</h2>
          {data.subscription ? (
            <>
              <p className="text-sm text-text-secondary">Current Plan</p>
              <p className="text-xl font-bold text-text-primary mt-1">{data.subscription.planName}</p>
              <p className="text-sm text-text-secondary mt-1">
                {formatCurrency(data.subscription.amount)} / {data.subscription.period}
              </p>
              <p className="text-sm text-text-secondary mt-1">
                Status: <span className="font-medium text-text-primary">{data.subscription.status}</span>
              </p>
              <p className="text-sm text-text-secondary mt-1">
                Next billing: {data.subscription.nextBillingDate ? new Date(data.subscription.nextBillingDate).toLocaleDateString() : 'N/A'}
              </p>
            </>
          ) : (
            <p className="text-sm text-text-secondary">No active subscription yet.</p>
          )}

          <Link
            href="/dashboard/subscription"
            className="inline-flex mt-4 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            Manage Subscription
          </Link>

          <div className="mt-6 pt-6 border-t border-border">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Recent Payments</h3>
            {data.paymentHistory.length === 0 ? (
              <p className="text-sm text-text-secondary">No payment records yet.</p>
            ) : (
              <div className="space-y-2">
                {data.paymentHistory.slice(0, 3).map(payment => (
                  <div key={payment.date} className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">{new Date(payment.date).toLocaleDateString()}</span>
                    <span className="font-medium text-text-primary">{formatCurrency(payment.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
