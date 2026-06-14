'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useApp } from '@/context/AppContext';

interface LeadRecord {
  id: string;
  schoolId: string;
  schoolName: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: 'new' | 'contacted' | 'qualified' | 'closed';
  createdAt: string;
  updatedAt: string;
}

interface LeadsResponse {
  leads: LeadRecord[];
  total: number;
  page: number;
  pages: number;
}

const statusOptions: Array<LeadRecord['status']> = ['new', 'contacted', 'qualified', 'closed'];

const fetcher = async ([url, token]: [string, string]) => {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await res.json();
  if (!res.ok) throw new Error(payload.error || 'Failed to load leads');
  return payload as LeadsResponse;
};

export default function DashboardLeadsPage() {
  const { token, showToast } = useApp();
  const [statusFilter, setStatusFilter] = useState<'all' | LeadRecord['status']>('all');

  const endpoint = `/api/leads?status=${statusFilter}`;
  const { data, error, isLoading, mutate } = useSWR(token ? [endpoint, token] : null, fetcher, {
    refreshInterval: 20000,
  });

  const updateStatus = async (leadId: string, status: LeadRecord['status']) => {
    if (!token) return;

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Unable to update lead');

      showToast('Lead updated', 'success');
      await mutate();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to update lead', 'error');
    }
  };

  if (!token) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <h1 className="text-2xl font-bold text-text-primary mb-3">Leads require sign in</h1>
        <p className="text-text-secondary">Sign in with your school account to manage inquiries.</p>
      </div>
    );
  }

  if (isLoading && !data) return <p className="text-text-secondary">Loading leads...</p>;
  if (error || !data) return <p className="text-error">{error instanceof Error ? error.message : 'Failed to load leads'}</p>;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Leads</h1>
          <p className="text-text-secondary mt-1">Track and respond to incoming school inquiries.</p>
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as 'all' | LeadRecord['status'])}
          className="px-3 py-2 text-sm border border-border rounded-lg bg-surface"
        >
          <option value="all">All statuses</option>
          {statusOptions.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>

      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-hover text-left">
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Contact</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Message</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.leads.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-sm text-text-secondary text-center">
                    No leads available for this filter.
                  </td>
                </tr>
              ) : data.leads.map(lead => (
                <tr key={lead.id} className="hover:bg-hover">
                  <td className="px-4 py-4 align-top">
                    <p className="text-sm font-medium text-text-primary">{lead.name}</p>
                    <p className="text-xs text-text-secondary">{lead.email}</p>
                    {lead.phone && <p className="text-xs text-text-secondary">{lead.phone}</p>}
                  </td>
                  <td className="px-4 py-4 align-top text-sm text-text-secondary max-w-lg">
                    <p className="line-clamp-3">{lead.message}</p>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <select
                      value={lead.status}
                      onChange={e => updateStatus(lead.id, e.target.value as LeadRecord['status'])}
                      className="px-3 py-2 text-xs border border-border rounded-lg bg-surface"
                    >
                      {statusOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-4 align-top text-xs text-text-muted">
                    {new Date(lead.createdAt).toLocaleString()}
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
