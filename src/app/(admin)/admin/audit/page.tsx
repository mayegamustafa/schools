'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useApp } from '@/context/AppContext';

interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  resource: string;
  resourceId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}

interface AuditResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  pages: number;
}

const fetcher = async ([url, token]: [string, string]) => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load');
  return data as AuditResponse;
};

function actionBadge(action: string) {
  const color =
    action.includes('delete') ? 'bg-error/10 text-error' :
    action.includes('create') || action.includes('signup') ? 'bg-success/10 text-success' :
    action.includes('update') || action.includes('edit') ? 'bg-primary/10 text-primary' :
    action.includes('login') || action.includes('logout') ? 'bg-accent/10 text-accent-dark' :
    'bg-hover text-text-muted';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-mono ${color}`}>
      {action}
    </span>
  );
}

export default function AdminAuditPage() {
  const { token } = useApp();
  const [q, setQ] = useState('');
  const [action, setAction] = useState('all');
  const [resource, setResource] = useState('all');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  const params = new URLSearchParams({ page: String(page), limit: '30' });
  if (action !== 'all') params.set('action', action);
  if (resource !== 'all') params.set('resource', resource);
  if (q) params.set('q', q);

  const { data, error, isLoading } = useSWR(
    token ? [`/api/admin/audit-logs?${params}`, token] : null,
    fetcher,
    { refreshInterval: 60000 }
  );

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('en-UG', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Audit Log</h1>
        <p className="text-text-secondary mt-1">Full history of platform actions for security and compliance.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search by actor, action, or resource…"
          value={q}
          onChange={e => { setQ(e.target.value); setPage(1); }}
          className="flex-1 min-w-[220px] px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
        />
        <select value={action} onChange={e => { setAction(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none">
          <option value="all">All actions</option>
          <option value="auth.login">auth.login</option>
          <option value="auth.logout">auth.logout</option>
          <option value="auth.signup">auth.signup</option>
          <option value="school.create">school.create</option>
          <option value="school.update">school.update</option>
          <option value="school.delete">school.delete</option>
          <option value="school.approve">school.approve</option>
          <option value="school.reject">school.reject</option>
          <option value="user.update">user.update</option>
          <option value="review.create">review.create</option>
          <option value="review.delete">review.delete</option>
          <option value="payment.create">payment.create</option>
        </select>
        <select value={resource} onChange={e => { setResource(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none">
          <option value="all">All resources</option>
          <option value="user">user</option>
          <option value="school">school</option>
          <option value="review">review</option>
          <option value="payment">payment</option>
          <option value="support-ticket">support-ticket</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        {isLoading && !data ? (
          <div className="p-8 text-center text-text-secondary text-sm">Loading audit logs…</div>
        ) : error ? (
          <div className="p-8 text-center text-error text-sm">Failed to load audit logs.</div>
        ) : !data?.logs.length ? (
          <div className="p-8 text-center text-text-muted text-sm">No logs found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface text-xs text-text-muted uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Time</th>
                <th className="px-4 py-3 text-left">Actor</th>
                <th className="px-4 py-3 text-left">Action</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Resource</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono text-xs">
              {data.logs.map(log => (
                <>
                  <tr key={log.id}
                    className="hover:bg-surface transition-colors cursor-pointer"
                    onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">{formatTime(log.createdAt)}</td>
                    <td className="px-4 py-3 text-text-primary">
                      <p className="font-medium">{log.actorName}</p>
                      <p className="text-text-muted">{log.actorId.slice(0, 8)}…</p>
                    </td>
                    <td className="px-4 py-3">{actionBadge(log.action)}</td>
                    <td className="px-4 py-3 text-text-secondary hidden md:table-cell">
                      <span className="capitalize">{log.resource}</span>
                      {log.resourceId && <span className="text-text-muted ml-1">#{log.resourceId.slice(0, 6)}…</span>}
                    </td>
                    <td className="px-4 py-3 text-text-muted hidden lg:table-cell max-w-[200px] truncate">
                      {Object.keys(log.details).length > 0 ? JSON.stringify(log.details).slice(0, 60) : '—'}
                    </td>
                  </tr>
                  {expanded === log.id && (
                    <tr key={`${log.id}-detail`} className="bg-surface">
                      <td colSpan={5} className="px-6 py-3">
                        <pre className="text-xs text-text-secondary overflow-auto max-h-40 whitespace-pre-wrap">
                          {JSON.stringify({ ...log, details: log.details }, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}

        {data && data.pages > 1 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between text-sm text-text-secondary">
            <span>{data.total} total entries</span>
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
    </div>
  );
}
