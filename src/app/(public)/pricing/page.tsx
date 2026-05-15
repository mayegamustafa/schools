'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { SubscriptionPlan } from '@/types';
import { formatCurrency } from '@/utils/helpers';

export default function PricingPage() {
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPlans = useCallback(async (targetPeriod: 'monthly' | 'yearly') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/plans?period=${targetPeriod}`);
      const data = await res.json();
      setPlans(data.plans || []);
    } catch {
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlans(period);
  }, [period, loadPlans]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-lg text-text-secondary max-w-2xl mx-auto mb-8">
          Choose the plan that fits your school. Get started with our Basic plan or go Premium for maximum visibility.
        </p>

        {/* Period Toggle */}
        <div className="inline-flex items-center bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setPeriod('monthly')}
            className={`px-6 py-2.5 text-sm font-medium rounded-lg transition-all ${
              period === 'monthly' ? 'bg-white text-text-primary shadow-sm' : 'text-text-secondary'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setPeriod('yearly')}
            className={`px-6 py-2.5 text-sm font-medium rounded-lg transition-all ${
              period === 'yearly' ? 'bg-white text-text-primary shadow-sm' : 'text-text-secondary'
            }`}
          >
            Yearly
            <span className="ml-1.5 text-xs text-secondary font-semibold">Save 17%</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
        {loading ? (
          <div className="md:col-span-2 bg-white rounded-2xl border border-border p-8 text-center text-text-secondary">
            Loading plans...
          </div>
        ) : plans.length === 0 ? (
          <div className="md:col-span-2 bg-white rounded-2xl border border-border p-8 text-center text-text-secondary">
            No plans available for this billing period.
          </div>
        ) : plans.map(plan => (
          <div key={plan.id}
            className={`bg-white rounded-2xl border-2 p-8 relative ${
              plan.isFeatured ? 'border-primary shadow-xl shadow-primary/10' : 'border-border'
            }`}
          >
            {plan.isFeatured && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-white text-xs font-semibold px-4 py-1.5 rounded-full">
                  Most Popular
                </span>
              </div>
            )}
            <div className="text-center mb-8">
              <h3 className="text-xl font-bold text-text-primary mb-2">{plan.name}</h3>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold text-text-primary">{formatCurrency(plan.price)}</span>
                <span className="text-text-muted">/{plan.period === 'monthly' ? 'mo' : 'yr'}</span>
              </div>
            </div>
            <ul className="space-y-3 mb-8">
              {plan.features.map(feature => (
                <li key={feature} className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-secondary shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-text-secondary">{feature}</span>
                </li>
              ))}
            </ul>
            <Link href="/schools/register"
              className={`block w-full text-center py-3 font-semibold rounded-xl transition-colors ${
                plan.isFeatured
                  ? 'bg-primary text-white hover:bg-primary-dark'
                  : 'bg-gray-100 text-text-primary hover:bg-gray-200'
              }`}
            >
              Get Started
            </Link>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div className="mt-20 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-text-primary text-center mb-8">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {[
            { q: 'Can I try before subscribing?', a: 'Yes! You can create your school profile for free. A subscription is only required to publish and make your listing visible to parents.' },
            { q: 'What payment methods do you accept?', a: 'We accept Mobile Money (MTN & Airtel), credit/debit cards, and bank transfers.' },
            { q: 'Can I cancel anytime?', a: 'Absolutely. You can cancel your subscription at any time. Your listing will remain active until the end of your billing period.' },
            { q: 'What happens when my subscription expires?', a: 'Your school listing will be hidden from search results until you renew. Your profile data will be preserved.' },
          ].map((faq, i) => (
            <details key={i} className="bg-white rounded-xl border border-border group">
              <summary className="px-6 py-4 text-sm font-semibold text-text-primary cursor-pointer list-none flex items-center justify-between">
                {faq.q}
                <svg className="w-5 h-5 text-text-muted group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-6 pb-4">
                <p className="text-sm text-text-secondary leading-relaxed">{faq.a}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
