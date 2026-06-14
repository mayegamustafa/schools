'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/utils/helpers';

interface SubscriptionRecord {
  id: string;
  schoolId: string;
  schoolName: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  period: string;
  status: string;
  periodStart: string;
  periodEnd: string | null;
  autoRenew: boolean;
}

interface SubscriptionResponse {
  subscriptions: SubscriptionRecord[];
}

interface PaymentResponse {
  payments: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    method: string | null;
    paidAt: string;
  }>;
}

interface PlansResponse {
  plans: Array<{
    id: string;
    name: string;
    price: number;
    currency: string;
    period: string;
    features: string[];
    isFeatured: boolean;
  }>;
}

const authFetcher = async <T,>([url, token]: [string, string]) => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const payload = await res.json();
  if (!res.ok) throw new Error(payload.error || 'Failed to fetch resource');
  return payload as T;
};

export default function DashboardSubscriptionPage() {
  const { token, showToast } = useApp();
  const [updatingPlanId, setUpdatingPlanId] = useState<string | null>(null);

  const subscriptions = useSWR(token ? ['/api/subscriptions', token] : null, authFetcher<SubscriptionResponse>);
  const payments = useSWR(token ? ['/api/payments?limit=20', token] : null, authFetcher<PaymentResponse>);
  const plans = useSWR(token ? ['/api/plans', token] : null, authFetcher<PlansResponse>);

  const currentSubscription = subscriptions.data?.subscriptions[0] || null;

  const activatePlan = async (planId: string) => {
    if (!token) return;

    setUpdatingPlanId(planId);
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId, status: 'active' }),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Unable to change plan');

      showToast('Subscription updated', 'success');
      await Promise.all([subscriptions.mutate(), payments.mutate()]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to change plan', 'error');
    } finally {
      setUpdatingPlanId(null);
    }
  };

  if (!token) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <h1 className="text-2xl font-bold text-text-primary mb-3">Subscription requires sign in</h1>
        <p className="text-text-secondary">Sign in with your school account to manage billing.</p>
      </div>
    );
  }

  if ((subscriptions.isLoading && !subscriptions.data) || (payments.isLoading && !payments.data) || (plans.isLoading && !plans.data)) {
    return <p className="text-text-secondary">Loading subscription details...</p>;
  }

  if (subscriptions.error || payments.error || plans.error) {
    const message = subscriptions.error || payments.error || plans.error;
    return <p className="text-error">{message instanceof Error ? message.message : 'Unable to load subscription data'}</p>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Subscription</h1>
        <p className="text-text-secondary mt-1">Manage your plan and payment history.</p>
      </div>

      <div className="bg-surface rounded-2xl border border-border p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Current Plan</h2>
        {currentSubscription ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-text-secondary">Plan</p>
              <p className="text-lg font-semibold text-text-primary">{currentSubscription.planName}</p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Billing</p>
              <p className="text-lg font-semibold text-text-primary">
                {formatCurrency(currentSubscription.amount)} / {currentSubscription.period}
              </p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Status</p>
              <p className="text-sm font-medium text-text-primary capitalize">{currentSubscription.status}</p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Next Billing</p>
              <p className="text-sm font-medium text-text-primary">
                {currentSubscription.periodEnd ? new Date(currentSubscription.periodEnd).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-secondary">No active subscription yet. Choose a plan below.</p>
        )}
      </div>

      <div className="bg-surface rounded-2xl border border-border p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(plans.data?.plans || []).map(plan => {
            const isCurrent = currentSubscription?.planId === plan.id;
            return (
              <div key={plan.id} className={`rounded-xl border p-5 ${plan.isFeatured ? 'border-primary/50 bg-primary/5' : 'border-border'}`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-semibold text-text-primary">{plan.name}</h3>
                  {plan.isFeatured && (
                    <span className="text-xs px-2 py-1 bg-primary text-white rounded-full">Popular</span>
                  )}
                </div>
                <p className="text-sm text-text-secondary mb-3">{formatCurrency(plan.price)} / {plan.period}</p>
                <ul className="text-xs text-text-secondary space-y-1 mb-4">
                  {plan.features.slice(0, 4).map(feature => (
                    <li key={feature}>• {feature}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={isCurrent || updatingPlanId === plan.id}
                  onClick={() => activatePlan(plan.id)}
                  className={`w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors ${isCurrent ? 'bg-hover text-text-muted cursor-not-allowed' : 'bg-primary text-white hover:bg-primary-dark'}`}
                >
                  {isCurrent ? 'Current Plan' : updatingPlanId === plan.id ? 'Updating...' : 'Choose Plan'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-border p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Payment History</h2>
        {(payments.data?.payments || []).length === 0 ? (
          <p className="text-sm text-text-secondary">No payment records yet.</p>
        ) : (
          <div className="space-y-3">
            {payments.data?.payments.map(payment => (
              <div key={payment.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-text-primary">{new Date(payment.paidAt).toLocaleString()}</p>
                  <p className="text-xs text-text-secondary">{payment.method || 'Unspecified method'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-text-primary">{formatCurrency(payment.amount)}</p>
                  <p className="text-xs text-text-secondary capitalize">{payment.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
