'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useApp } from '@/context/AppContext';

type SchoolStatus = 'active' | 'pending' | 'rejected' | 'suspended';

interface AdminOverviewResponse {
  schools: Array<{
    id: string;
    slug: string;
    name: string;
    city: string;
    type: string;
    rating: number;
    status: SchoolStatus;
    plan: string;
    createdAt: string;
  }>;
}

const fetcher = async ([url, token]: [string, string]) => {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await res.json();
  if (!res.ok) throw new Error(payload.error || 'Failed to load schools');
  return payload as AdminOverviewResponse;
};

export default function AdminSchoolsPage() {
  const { token, showToast } = useApp();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<SchoolStatus | 'all'>('all');

  const endpoint = `/api/admin/overview?q=${encodeURIComponent(query)}&status=${status}`;
  const { data, error, isLoading, mutate } = useSWR(
    token ? [endpoint, token] : null,
    fetcher,
    { refreshInterval: 30000 }
  );

  const updateSchoolStatus = async (schoolIdOrSlug: string, nextStatus: SchoolStatus) => {
    if (!token) return;

    try {
      const res = await fetch(`/api/schools/${schoolIdOrSlug}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Unable to update status');

      showToast(`School updated to ${nextStatus}`, 'success');
      await mutate();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to update status', 'error');
    }
  };

  if (!token) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <h1 className="text-2xl font-bold text-text-primary mb-3">Admin access required</h1>
        <p className="text-text-secondary">Sign in with an admin account to manage schools.</p>
      </div>
    );
  }

  if (isLoading && !data) return <p className="text-text-secondary">Loading schools...</p>;
  if (error || !data) return <p className="text-error">{error instanceof Error ? error.message : 'Unable to load schools'}</p>;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Schools</h1>
          <p className="text-text-secondary mt-1">Approve, suspend, and monitor school listings.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name or location"
            className="px-3 py-2 text-sm border border-border rounded-lg"
          />
          <select
            value={status}
            onChange={e => setStatus(e.target.value as SchoolStatus | 'all')}
            className="px-3 py-2 text-sm border border-border rounded-lg bg-surface"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-hover text-left">
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">School</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Rating</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Plan</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.schools.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-sm text-text-secondary text-center">
                    No schools found for this filter.
                  </td>
                </tr>
              ) : data.schools.map(school => (
                <tr key={school.id} className="hover:bg-hover">
                  <td className="px-4 py-4">
                    <p className="text-sm font-medium text-text-primary">{school.name}</p>
                    <p className="text-xs text-text-secondary">{school.city}</p>
                  </td>
                  <td className="px-4 py-4 text-sm text-text-secondary capitalize">{school.type}</td>
                  <td className="px-4 py-4 text-sm text-text-secondary">{school.rating.toFixed(1)}</td>
                  <td className="px-4 py-4 text-sm text-text-secondary capitalize">{school.status}</td>
                  <td className="px-4 py-4 text-sm text-text-secondary">{school.plan}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 text-xs">
                      <Link href={`/schools/${school.id}`} className="text-primary hover:underline">View</Link>
                      {school.status !== 'active' && (
                        <button onClick={() => updateSchoolStatus(school.id, 'active')} className="text-secondary hover:underline">
                          Activate
                        </button>
                      )}
                      {school.status !== 'suspended' && (
                        <button onClick={() => updateSchoolStatus(school.id, 'suspended')} className="text-error hover:underline">
                          Suspend
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
