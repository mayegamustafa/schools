'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useApp } from '@/context/AppContext';
import { formatDate } from '@/utils/helpers';

interface SupportTicket {
  id: string;
  submitterName: string;
  submitterEmail: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SupportResponse {
  tickets: SupportTicket[];
  total: number;
  page: number;
  pages: number;
  summary: { openCount: number; resolvedCount: number; urgentCount: number };
}

const fetcher = async ([url, token]: [string, string]) => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load');
  return data as SupportResponse;
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-accent/10 text-accent-dark',
  in_progress: 'bg-primary/10 text-primary',
  resolved: 'bg-success/10 text-success',
  closed: 'bg-hover text-text-muted',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-hover text-text-muted',
  normal: 'bg-primary/10 text-primary',
  high: 'bg-accent/10 text-accent-dark',
  urgent: 'bg-error/10 text-error',
};

export default function AdminSupportPage() {
  const { token, showToast } = useApp();
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [updating, setUpdating] = useState(false);

  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (status !== 'all') params.set('status', status);
  if (priority !== 'all') params.set('priority', priority);
  if (q) params.set('q', q);

  const { data, error, isLoading, mutate } = useSWR(
    token ? [`/api/admin/support?${params}`, token] : null,
    fetcher,
    { refreshInterval: 30000 }
  );

  const openTicket = (ticket: SupportTicket) => {
    setSelected(ticket);
    setAdminNote(ticket.adminNote || '');
  };

  const updateTicket = async (newStatus?: string) => {
    if (!selected || !token) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/support/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus || selected.status, adminNote }),
      });
      if (!res.ok) throw new Error();
      showToast('Ticket updated', 'success');
      mutate();
      setSelected(null);
    } catch {
      showToast('Failed to update ticket', 'error');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Support Tickets</h1>
        <p className="text-text-secondary mt-1">Review and respond to user support requests.</p>
      </div>

      {data && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Open', value: data.summary.openCount, color: 'text-accent-dark' },
            { label: 'Resolved', value: data.summary.resolvedCount, color: 'text-success' },
            { label: 'Urgent', value: data.summary.urgentCount, color: 'text-error' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-border p-4">
              <p className="text-xs text-text-muted uppercase tracking-wider">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search by subject or name…"
          value={q}
          onChange={e => { setQ(e.target.value); setPage(1); }}
          className="flex-1 min-w-[200px] px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
        />
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none">
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select value={priority} onChange={e => { setPriority(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none">
          <option value="all">All priorities</option>
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        {isLoading && !data ? (
          <div className="p-8 text-center text-text-secondary text-sm">Loading tickets…</div>
        ) : error ? (
          <div className="p-8 text-center text-error text-sm">Failed to load support tickets.</div>
        ) : !data?.tickets.length ? (
          <div className="p-8 text-center text-text-muted text-sm">No tickets found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface text-xs text-text-muted uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Subject</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">From</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Priority</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.tickets.map(ticket => (
                <tr key={ticket.id} className="hover:bg-surface transition-colors">
                  <td className="px-4 py-3 font-medium text-text-primary max-w-[200px] truncate">{ticket.subject}</td>
                  <td className="px-4 py-3 text-text-secondary hidden md:table-cell">
                    <p className="truncate max-w-[150px]">{ticket.submitterName}</p>
                    <p className="text-xs text-text-muted truncate">{ticket.submitterEmail}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[ticket.status] || 'bg-hover text-text-muted'}`}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PRIORITY_COLORS[ticket.priority] || ''}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-muted text-xs hidden lg:table-cell">{formatDate(ticket.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openTicket(ticket)}
                      className="text-xs text-primary hover:underline font-medium">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {data && data.pages > 1 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between text-sm text-text-secondary">
            <span>{data.total} total</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 rounded-lg border border-border disabled:opacity-40 hover:bg-hover transition-colors text-xs">Prev</button>
              <span className="px-2 py-1 text-xs">{page} / {data.pages}</span>
              <button disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 rounded-lg border border-border disabled:opacity-40 hover:bg-hover transition-colors text-xs">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Ticket modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl border border-border w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-text-primary">Ticket Details</h2>
              <button onClick={() => setSelected(null)} className="text-text-muted hover:text-text-primary text-xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">Subject</p>
                <p className="text-sm font-semibold text-text-primary">{selected.subject}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">From</p>
                  <p className="text-sm text-text-primary">{selected.submitterName}</p>
                  <p className="text-xs text-text-muted">{selected.submitterEmail}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">Received</p>
                  <p className="text-sm text-text-primary">{formatDate(selected.createdAt)}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">Message</p>
                <p className="text-sm text-text-secondary leading-relaxed bg-surface rounded-lg p-3 border border-border">{selected.message}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-1">Admin Note</label>
                <textarea rows={3} value={adminNote} onChange={e => setAdminNote(e.target.value)}
                  placeholder="Internal note (not sent to submitter)"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none" />
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => updateTicket('resolved')} disabled={updating}
                  className="px-4 py-2 bg-success text-white rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-50">
                  Mark Resolved
                </button>
                <button onClick={() => updateTicket('in_progress')} disabled={updating}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-dark disabled:opacity-50">
                  In Progress
                </button>
                <button onClick={() => updateTicket('closed')} disabled={updating}
                  className="px-4 py-2 border border-border rounded-lg text-xs font-medium text-text-secondary hover:bg-hover disabled:opacity-50">
                  Close
                </button>
                <button onClick={() => updateTicket()} disabled={updating}
                  className="px-4 py-2 border border-border rounded-lg text-xs font-medium text-text-secondary hover:bg-hover disabled:opacity-50">
                  {updating ? 'Saving…' : 'Save Note'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
