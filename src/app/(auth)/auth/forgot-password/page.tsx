'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * Interim password recovery.
 *
 * There is no transactional email provider configured yet, so this raises a
 * verified-reset request in the support queue rather than mailing a reset link.
 * An admin confirms the requester owns the account and sets a new password via
 * the users console. Replace this with a token + email flow once SMTP exists —
 * the "Forgot password?" link previously went nowhere at all, which left school
 * owners with no recovery path.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, schoolName }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to send your request');

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send your request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text-primary">Reset your password</h1>
          <p className="text-text-secondary mt-2">
            Tell us which account needs resetting and our team will verify you and restore access.
          </p>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-text-primary font-medium">Request received</p>
              <p className="text-sm text-text-secondary">
                If an account exists for <span className="font-medium">{email}</span>, our team will contact
                you on that address to verify and reset it.
              </p>
              <Link href="/auth/login" className="inline-block text-sm text-primary font-medium hover:text-primary-dark">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-text-primary mb-2">
                  Account email
                </label>
                <input
                  id="reset-email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
              <div>
                <label htmlFor="reset-name" className="block text-sm font-medium text-text-primary mb-2">
                  Your full name
                </label>
                <input
                  id="reset-name"
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="John Doe"
                  autoComplete="name"
                  className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
              <div>
                <label htmlFor="reset-school" className="block text-sm font-medium text-text-primary mb-2">
                  School name <span className="text-text-muted font-normal">(if you manage a listing)</span>
                </label>
                <input
                  id="reset-school"
                  type="text"
                  value={schoolName}
                  onChange={e => setSchoolName(e.target.value)}
                  placeholder="e.g. Kampala Junior Academy"
                  className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
                <p className="text-xs text-text-muted mt-1.5">
                  Helps us confirm you own the listing before resetting access.
                </p>
              </div>

              {error && <p className="text-sm text-error bg-error/10 px-4 py-2 rounded-lg">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'Request password reset'}
              </button>
            </form>
          )}
        </div>

        {!sent && (
          <p className="mt-6 text-center text-sm text-text-secondary">
            Remembered it?{' '}
            <Link href="/auth/login" className="text-primary font-medium hover:text-primary-dark">Sign in</Link>
          </p>
        )}
      </div>
    </div>
  );
}
