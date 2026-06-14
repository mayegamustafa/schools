'use client';

import useSWR from 'swr';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/utils/helpers';

interface PaymentsResponse {
  payments: Array<{
    id: string;
    schoolId: string;
    schoolName: string;
    amount: number;
    currency: string;
    status: string;
    method: string | null;
    reference: string | null;
    paidAt: string;
  }>;
  total: number;
  summary: {
    totalAmount: number;
    recordsInPage: number;
  };
}

interface AdminPaymentsResponse {
  summary: {
    totalRevenue: number;
    monthlyRevenue: number;
    activeCount: number;
    revenueByPlan: Array<{
      plan: string;
      count: number;
      revenue: number;
      period: string;
    }>;
    monthlyTrend: Array<{
      month: string;
      revenue: number;
    }>;
  };
}

const fetcher = async ([url, token]: [string, string]) => {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await res.json();
  if (!res.ok) throw new Error(payload.error || 'Failed to load payments');
  return payload;
};

export default function AdminPaymentsPage() {
  const { token } = useApp();

  const payments = useSWR(token ? ['/api/payments?limit=50', token] : null, fetcher);
  const summary = useSWR(token ? ['/api/admin/payments?limit=20', token] : null, fetcher);

  if (!token) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <h1 className="text-2xl font-bold text-text-primary mb-3">Admin access required</h1>
        <p className="text-text-secondary">Sign in with an admin account to view payments.</p>
      </div>
    );
  }

  if ((payments.isLoading && !payments.data) || (summary.isLoading && !summary.data)) {
    return <p className="text-text-secondary">Loading payments...</p>;
  }

  if (payments.error || summary.error || !payments.data || !summary.data) {
    const message = payments.error || summary.error;
    return <p className="text-error">{message instanceof Error ? message.message : 'Unable to load payments'}</p>;
  }

  const paymentsData = payments.data as PaymentsResponse;
  const summaryData = summary.data as AdminPaymentsResponse;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Payments</h1>
        <p className="text-text-secondary mt-1">Revenue health, subscriptions, and payment records.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface rounded-2xl border border-border p-5">
          <p className="text-xs text-text-muted uppercase tracking-wider">Total Revenue</p>
          <p className="text-2xl font-bold text-text-primary mt-2">{formatCurrency(summaryData.summary.totalRevenue)}</p>
        </div>
        <div className="bg-surface rounded-2xl border border-border p-5">
          <p className="text-xs text-text-muted uppercase tracking-wider">Monthly MRR</p>
          <p className="text-2xl font-bold text-text-primary mt-2">{formatCurrency(summaryData.summary.monthlyRevenue)}</p>
        </div>
        <div className="bg-surface rounded-2xl border border-border p-5">
          <p className="text-xs text-text-muted uppercase tracking-wider">Active Subscriptions</p>
          <p className="text-2xl font-bold text-text-primary mt-2">{summaryData.summary.activeCount}</p>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-border p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Revenue by Plan</h2>
        {summaryData.summary.revenueByPlan.length === 0 ? (
          <p className="text-sm text-text-secondary">No active subscription revenue yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {summaryData.summary.revenueByPlan.map(plan => (
              <div key={plan.plan} className="rounded-xl bg-hover p-4">
                <p className="text-sm font-medium text-text-primary">{plan.plan}</p>
                <p className="text-lg font-bold text-text-primary mt-2">{formatCurrency(plan.revenue)}</p>
                <p className="text-xs text-text-secondary mt-1">{plan.count} active subscriptions</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Recent Payments</h2>
          <p className="text-sm text-text-secondary">{paymentsData.total} records</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-hover text-left">
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">School</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Method</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paymentsData.payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-sm text-text-secondary text-center">No payments found.</td>
                </tr>
              ) : paymentsData.payments.map(payment => (
                <tr key={payment.id} className="hover:bg-hover">
                  <td className="px-4 py-4 text-sm font-medium text-text-primary">{payment.schoolName}</td>
                  <td className="px-4 py-4 text-sm text-text-secondary">{formatCurrency(payment.amount)}</td>
                  <td className="px-4 py-4 text-sm text-text-secondary capitalize">{payment.status}</td>
                  <td className="px-4 py-4 text-sm text-text-secondary">{payment.method || 'N/A'}</td>
                  <td className="px-4 py-4 text-sm text-text-secondary">{new Date(payment.paidAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
