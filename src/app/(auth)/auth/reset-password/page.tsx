'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import PasswordField, { PasswordChecklist, passwordProblem } from '@/components/ui/PasswordField';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const problem = passwordProblem(password, confirm);
    if (problem) {
      setTouched(true);
      setError(problem);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not reset your password');

      setDone(true);
      setTimeout(() => router.push('/auth/login'), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset your password');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="bg-surface rounded-2xl border border-border p-8 text-center">
        <p className="text-sm text-text-primary font-medium mb-2">This link is incomplete</p>
        <p className="text-sm text-text-secondary mb-5">
          Open the link exactly as it appears in your email, or request a new one.
        </p>
        <Link href="/auth/forgot-password" className="text-sm text-primary font-medium hover:text-primary-dark">
          Request a new reset link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="bg-surface rounded-2xl border border-border p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm font-medium text-text-primary">Password updated</p>
        <p className="text-sm text-text-secondary">Taking you to sign in…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface rounded-2xl border border-border p-8 space-y-5">
      <div>
        <PasswordField
          id="reset-password"
          label="New password"
          required
          value={password}
          onChange={value => { setTouched(true); setPassword(value); }}
          placeholder="Choose a strong password"
          autoComplete="new-password"
        />
        <PasswordChecklist value={password} />
      </div>

      <PasswordField
        id="reset-confirm"
        label="Confirm new password"
        required
        value={confirm}
        onChange={value => { setTouched(true); setConfirm(value); }}
        placeholder="Repeat password"
        autoComplete="new-password"
        error={touched && confirm && password !== confirm ? 'Passwords do not match' : null}
      />

      {error && <p className="text-sm text-error bg-error/10 px-4 py-2 rounded-lg">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
      >
        {loading ? 'Updating…' : 'Set new password'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text-primary">Choose a new password</h1>
          <p className="text-text-secondary mt-2">Then sign in with your new details.</p>
        </div>

        <Suspense fallback={<div className="bg-surface rounded-2xl border border-border p-8 h-64 skeleton" />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
