'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/utils/helpers';

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  period: string;
  features: string[];
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
}

interface PlansResponse {
  plans: Plan[];
}

const fetcher = async ([url, token]: [string, string]) => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const payload = await res.json();
  if (!res.ok) throw new Error(payload.error || 'Failed to load plans');
  return payload as PlansResponse;
};

function parseFeatureText(value: string): string[] {
  return value
    .split('\n')
    .map(item => item.split(',').map(piece => piece.trim()))
    .flat()
    .filter(Boolean);
}

export default function AdminPlansPage() {
  const { token, showToast } = useApp();
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [form, setForm] = useState({
    name: '',
    price: '',
    currency: 'UGX',
    period: 'monthly',
    features: '',
    isActive: true,
    isFeatured: false,
    sortOrder: '0',
  });
  const [saving, setSaving] = useState(false);

  const endpoint = `/api/admin/plans?status=${status}`;
  const { data, error, isLoading, mutate } = useSWR(
    token ? [endpoint, token] : null,
    fetcher,
    { refreshInterval: 30000 }
  );

  const createPlan = async () => {
    if (!token) return;

    setSaving(true);
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name,
          price: Number(form.price),
          currency: form.currency,
          period: form.period,
          features: parseFeatureText(form.features),
          isActive: form.isActive,
          isFeatured: form.isFeatured,
          sortOrder: Number(form.sortOrder),
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to create plan');

      showToast('Plan created successfully', 'success');
      setForm(prev => ({ ...prev, name: '', price: '', features: '', isFeatured: false }));
      await mutate();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create plan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const updatePlan = async (planId: string, changes: Partial<Plan>) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/plans/${planId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(changes),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to update plan');
      showToast('Plan updated', 'success');
      await mutate();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update plan', 'error');
    }
  };

  if (!token) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <h1 className="text-2xl font-bold text-text-primary mb-3">Admin access required</h1>
        <p className="text-text-secondary">Sign in with an admin account to manage plans.</p>
      </div>
    );
  }

  if (isLoading && !data) return <p className="text-text-secondary">Loading plans...</p>;
  if (error || !data) return <p className="text-error">{error instanceof Error ? error.message : 'Unable to load plans'}</p>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Subscription Plans</h1>
          <p className="text-text-secondary mt-1">Create, activate, and curate pricing plans.</p>
        </div>
        <select
          value={status}
          onChange={event => setStatus(event.target.value as 'all' | 'active' | 'inactive')}
          className="px-3 py-2 text-sm border border-border rounded-lg bg-white"
        >
          <option value="all">All plans</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">Create Plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Plan Name</label>
            <input
              type="text"
              value={form.name}
              onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))}
              className="w-full px-4 py-3 border border-border rounded-xl text-sm"
              placeholder="Premium Annual"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Price</label>
            <input
              type="number"
              min="0"
              value={form.price}
              onChange={event => setForm(prev => ({ ...prev, price: event.target.value }))}
              className="w-full px-4 py-3 border border-border rounded-xl text-sm"
              placeholder="2490000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Currency</label>
            <input
              type="text"
              value={form.currency}
              onChange={event => setForm(prev => ({ ...prev, currency: event.target.value }))}
              className="w-full px-4 py-3 border border-border rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Billing Period</label>
            <select
              value={form.period}
              onChange={event => setForm(prev => ({ ...prev, period: event.target.value }))}
              className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-white"
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Sort Order</label>
            <input
              type="number"
              value={form.sortOrder}
              onChange={event => setForm(prev => ({ ...prev, sortOrder: event.target.value }))}
              className="w-full px-4 py-3 border border-border rounded-xl text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={event => setForm(prev => ({ ...prev, isActive: event.target.checked }))}
              />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={event => setForm(prev => ({ ...prev, isFeatured: event.target.checked }))}
              />
              Featured
            </label>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">Features (one per line)</label>
          <textarea
            rows={4}
            value={form.features}
            onChange={event => setForm(prev => ({ ...prev, features: event.target.value }))}
            className="w-full px-4 py-3 border border-border rounded-xl text-sm resize-none"
            placeholder="Priority placement\nUnlimited gallery photos"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            disabled={saving || !form.name.trim() || !form.period.trim()}
            onClick={createPlan}
            className="px-5 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create Plan'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Plans</h2>
          <p className="text-sm text-text-secondary">{data.plans.length} total</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Plan</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Price</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Period</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Featured</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.plans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-sm text-text-secondary text-center">No plans created yet.</td>
                </tr>
              ) : data.plans.map(plan => (
                <tr key={plan.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <p className="text-sm font-medium text-text-primary">{plan.name}</p>
                    <p className="text-xs text-text-secondary">{plan.features.length} features · Sort {plan.sortOrder}</p>
                  </td>
                  <td className="px-4 py-4 text-sm text-text-secondary">{formatCurrency(plan.price, plan.currency)}</td>
                  <td className="px-4 py-4 text-sm text-text-secondary capitalize">{plan.period}</td>
                  <td className="px-4 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${plan.isActive ? 'bg-success/10 text-success' : 'bg-gray-100 text-text-secondary'}`}>
                      {plan.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${plan.isFeatured ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-text-secondary'}`}>
                      {plan.isFeatured ? 'Featured' : 'Standard'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => updatePlan(plan.id, { isActive: !plan.isActive })}
                        className="text-secondary hover:underline"
                      >
                        {plan.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => updatePlan(plan.id, { isFeatured: !plan.isFeatured })}
                        className="text-primary hover:underline"
                      >
                        {plan.isFeatured ? 'Unfeature' : 'Feature'}
                      </button>
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
