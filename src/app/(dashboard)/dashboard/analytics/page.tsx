'use client';

import useSWR from 'swr';
import { useApp } from '@/context/AppContext';
import DonutChart from '@/components/charts/DonutChart';

interface AnalyticsPayload {
  stats: {
    totalViews: number;
    totalClicks: number;
    totalMessages: number;
    viewsTrend: number;
    clicksTrend: number;
    messagesTrend: number;
  };
  analytics: {
    topSearchTerms: Array<{ term: string; views: number }>;
    visitorSources: Array<{ source: string; pct: number }>;
  };
}

const fetcher = async ([url, token]: [string, string]) => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const payload = await res.json();
  if (!res.ok) throw new Error(payload.error || 'Failed to load analytics');
  return payload as AnalyticsPayload;
};

export default function DashboardAnalyticsPage() {
  const { token } = useApp();

  const { data, error, isLoading } = useSWR(
    token ? ['/api/dashboard', token] : null,
    fetcher,
    { refreshInterval: 30000 }
  );

  if (!token) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <h1 className="text-2xl font-bold text-text-primary mb-3">Analytics require sign in</h1>
        <p className="text-text-secondary">Sign in with your school account to view analytics.</p>
      </div>
    );
  }

  if (isLoading && !data) return <p className="text-text-secondary">Loading analytics...</p>;
  if (error || !data) return <p className="text-error">{error instanceof Error ? error.message : 'Failed to load analytics'}</p>;

  const chartColors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Analytics</h1>
        <p className="text-text-secondary mt-1">Performance trends and traffic insights for your listing.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface rounded-2xl border border-border p-5">
          <p className="text-sm text-text-secondary">Total Views</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{data.stats.totalViews}</p>
          <p className={`text-xs mt-1 ${data.stats.viewsTrend >= 0 ? 'text-secondary' : 'text-error'}`}>
            {data.stats.viewsTrend >= 0 ? '+' : ''}{data.stats.viewsTrend}% vs previous period
          </p>
        </div>
        <div className="bg-surface rounded-2xl border border-border p-5">
          <p className="text-sm text-text-secondary">Link Clicks</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{data.stats.totalClicks}</p>
          <p className={`text-xs mt-1 ${data.stats.clicksTrend >= 0 ? 'text-secondary' : 'text-error'}`}>
            {data.stats.clicksTrend >= 0 ? '+' : ''}{data.stats.clicksTrend}% vs previous period
          </p>
        </div>
        <div className="bg-surface rounded-2xl border border-border p-5">
          <p className="text-sm text-text-secondary">Leads</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{data.stats.totalMessages}</p>
          <p className={`text-xs mt-1 ${data.stats.messagesTrend >= 0 ? 'text-secondary' : 'text-error'}`}>
            {data.stats.messagesTrend >= 0 ? '+' : ''}{data.stats.messagesTrend}% vs previous period
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface rounded-2xl border border-border p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Top Search Terms</h2>
          {data.analytics.topSearchTerms.length === 0 ? (
            <p className="text-sm text-text-secondary">No search term data yet.</p>
          ) : (
            <div className="space-y-3">
              {data.analytics.topSearchTerms.map(term => (
                <div key={term.term}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-text-primary">{term.term}</span>
                    <span className="text-text-secondary">{term.views} views</span>
                  </div>
                  <div className="w-full h-2 bg-hover rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${Math.min(100, Math.max(5, Math.round((term.views / Math.max(data.stats.totalViews, 1)) * 100)))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface rounded-2xl border border-border p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Visitor Sources</h2>
          <DonutChart
            size={180}
            thickness={28}
            data={data.analytics.visitorSources.map((source, idx) => ({
              label: source.source,
              value: source.pct,
              color: chartColors[idx % chartColors.length],
            }))}
            centerLabel="Total"
            centerValue="100%"
            formatValue={value => `${value}%`}
          />
        </div>
      </div>
    </div>
  );
}
