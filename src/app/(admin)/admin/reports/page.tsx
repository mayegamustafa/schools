'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useApp } from '@/context/AppContext';

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

interface AuditLogsResponse {
  logs: Array<{
    id: string;
    actorName: string;
    action: string;
    resource: string;
    resourceId: string | null;
    createdAt: string;
  }>;
  total: number;
}

interface SupportTicketsResponse {
  tickets: Array<{
    id: string;
    submitterName: string;
    submitterEmail: string;
    subject: string;
    status: TicketStatus;
    priority: TicketPriority;
    createdAt: string;
    updatedAt: string;
  }>;
  total: number;
  summary: {
    openCount: number;
    resolvedCount: number;
    urgentCount: number;
  };
}

const fetcher = async ([url, token]: [string, string]) => {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await res.json();
  if (!res.ok) throw new Error(payload.error || 'Failed to load report data');
  return payload;
};

export default function AdminReportsPage() {
  const { token, showToast } = useApp();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<TicketStatus | 'all'>('all');
  const [priority, setPriority] = useState<TicketPriority | 'all'>('all');

  const logsEndpoint = `/api/admin/audit-logs?limit=20&q=${encodeURIComponent(query)}`;
  const ticketsEndpoint = `/api/admin/support?limit=20&status=${status}&priority=${priority}&q=${encodeURIComponent(query)}`;

  const logs = useSWR(token ? [logsEndpoint, token] : null, fetcher, { refreshInterval: 30000 });
  const tickets = useSWR(token ? [ticketsEndpoint, token] : null, fetcher, { refreshInterval: 15000 });

  const updateTicket = async (ticketId: string, data: Partial<{ status: TicketStatus; priority: TicketPriority }>) => {
    if (!token) return;

    try {
      const res = await fetch(`/api/admin/support/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Unable to update ticket');

      showToast('Ticket updated', 'success');
      await tickets.mutate();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to update ticket', 'error');
    }
  };

  if (!token) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <h1 className="text-2xl font-bold text-text-primary mb-3">Admin access required</h1>
        <p className="text-text-secondary">Sign in with an admin account to access reports.</p>
      </div>
    );
  }

  if ((logs.isLoading && !logs.data) || (tickets.isLoading && !tickets.data)) {
    return <p className="text-text-secondary">Loading reports...</p>;
  }

  if (logs.error || tickets.error || !logs.data || !tickets.data) {
    const message = logs.error || tickets.error;
    return <p className="text-error">{message instanceof Error ? message.message : 'Unable to load reports'}</p>;
  }

  const logsData = logs.data as AuditLogsResponse;
  const ticketsData = tickets.data as SupportTicketsResponse;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Reports</h1>
          <p className="text-text-secondary mt-1">Review support tickets and admin activity logs.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search actor, subject, or email"
            className="px-3 py-2 text-sm border border-border rounded-lg"
          />
          <select
            value={status}
            onChange={e => setStatus(e.target.value as TicketStatus | 'all')}
            className="px-3 py-2 text-sm border border-border rounded-lg bg-surface"
          >
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={priority}
            onChange={e => setPriority(e.target.value as TicketPriority | 'all')}
            className="px-3 py-2 text-sm border border-border rounded-lg bg-surface"
          >
            <option value="all">All priorities</option>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface rounded-2xl border border-border p-5">
          <p className="text-xs text-text-muted uppercase tracking-wider">Open Tickets</p>
          <p className="text-2xl font-bold text-text-primary mt-2">{ticketsData.summary.openCount}</p>
        </div>
        <div className="bg-surface rounded-2xl border border-border p-5">
          <p className="text-xs text-text-muted uppercase tracking-wider">Resolved Tickets</p>
          <p className="text-2xl font-bold text-text-primary mt-2">{ticketsData.summary.resolvedCount}</p>
        </div>
        <div className="bg-surface rounded-2xl border border-border p-5">
          <p className="text-xs text-text-muted uppercase tracking-wider">Urgent Tickets</p>
          <p className="text-2xl font-bold text-text-primary mt-2">{ticketsData.summary.urgentCount}</p>
        </div>
        <div className="bg-surface rounded-2xl border border-border p-5">
          <p className="text-xs text-text-muted uppercase tracking-wider">Audit Logs</p>
          <p className="text-2xl font-bold text-text-primary mt-2">{logsData.total}</p>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Support Tickets</h2>
          <p className="text-sm text-text-secondary">{ticketsData.total} records</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-hover text-left">
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Submitter</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Subject</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Priority</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ticketsData.tickets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-sm text-text-secondary text-center">No tickets found.</td>
                </tr>
              ) : ticketsData.tickets.map(ticket => (
                <tr key={ticket.id} className="hover:bg-hover">
                  <td className="px-4 py-4">
                    <p className="text-sm font-medium text-text-primary">{ticket.submitterName}</p>
                    <p className="text-xs text-text-secondary">{ticket.submitterEmail}</p>
                  </td>
                  <td className="px-4 py-4 text-sm text-text-secondary">{ticket.subject}</td>
                  <td className="px-4 py-4">
                    <select
                      value={ticket.status}
                      onChange={e => updateTicket(ticket.id, { status: e.target.value as TicketStatus })}
                      className="px-2 py-1 text-sm border border-border rounded-lg bg-surface"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </td>
                  <td className="px-4 py-4">
                    <select
                      value={ticket.priority}
                      onChange={e => updateTicket(ticket.id, { priority: e.target.value as TicketPriority })}
                      className="px-2 py-1 text-sm border border-border rounded-lg bg-surface"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </td>
                  <td className="px-4 py-4 text-sm text-text-secondary">{new Date(ticket.updatedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Recent Audit Logs</h2>
          <p className="text-sm text-text-secondary">{logsData.total} records</p>
        </div>
        <div className="divide-y divide-border">
          {logsData.logs.length === 0 ? (
            <p className="px-6 py-8 text-sm text-text-secondary text-center">No audit records found.</p>
          ) : logsData.logs.map(log => (
            <div key={log.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {log.actorName} performed <span className="capitalize">{log.action}</span> on <span className="capitalize">{log.resource}</span>
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  {log.resourceId ? `Resource ID: ${log.resourceId}` : 'No resource ID'}
                </p>
              </div>
              <p className="text-xs text-text-secondary">{new Date(log.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
