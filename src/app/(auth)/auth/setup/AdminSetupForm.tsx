'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PasswordField, { PasswordChecklist, passwordProblem } from '@/components/ui/PasswordField';

type SetupMode = 'bootstrap' | 'recovery' | 'disabled';

interface Status {
  mode: SetupMode;
  tokenConfigured: boolean;
}

export default function AdminSetupForm() {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [touched, setTouched] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [outcome, setOutcome] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetch('/api/admin/setup')
      .then(res => (res.ok ? res.json() : Promise.reject(new Error('unavailable'))))
      .then(data => { if (active) setStatus(data); })
      .catch(() => { if (active) setLoadFailed(true); });

    return () => { active = false; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const problem = passwordProblem(password, confirm);
    if (problem) {
      setTouched(true);
      setError(problem);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          ...(setupToken ? { setupToken } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Setup failed');

      setOutcome(data.outcome);
      setTimeout(() => router.push('/auth/login'), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadFailed) {
    return (
      <div className="bg-surface rounded-2xl border border-border p-8 text-center">
        <p className="text-sm text-text-primary font-medium mb-2">Setup is unavailable</p>
        <p className="text-sm text-text-secondary">
          The server could not be reached. If this persists, the database may be unreachable.
        </p>
      </div>
    );
  }

  if (!status) {
    return <div className="bg-surface rounded-2xl border border-border p-8 h-64 skeleton" />;
  }

  if (outcome) {
    const message =
      outcome === 'created' ? 'Administrator account created.'
        : outcome === 'promoted' ? 'That account is now an administrator.'
          : 'Administrator password reset.';

    return (
      <div className="bg-surface rounded-2xl border border-border p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm font-medium text-text-primary">{message}</p>
        <p className="text-sm text-text-secondary">Taking you to sign in…</p>
        <p className="text-xs text-text-muted pt-2 border-t border-border">
          Remove <code className="font-mono">ADMIN_SETUP_TOKEN</code> from your environment now that
          you are back in — it should not stay enabled longer than needed.
        </p>
      </div>
    );
  }

  // An admin exists and no token is configured: nothing here can be used, and
  // saying so plainly beats a form that always fails.
  if (status.mode === 'disabled') {
    return (
      <div className="bg-surface rounded-2xl border border-border p-8 space-y-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" d="M12 8v4.5M12 16h.01" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-text-primary">Setup is closed</p>
            <p className="text-sm text-text-secondary mt-1">
              An administrator already exists, so this page is disabled to stop anyone resetting
              admin access from the open internet.
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-hover border border-border p-4 space-y-2">
          <p className="text-xs font-semibold text-text-primary">To recover access</p>
          <p className="text-xs text-text-secondary">
            Set <code className="font-mono text-[11px]">ADMIN_SETUP_TOKEN</code> to a long random
            value in your hosting environment, redeploy, then reload this page. Remove it again
            afterwards.
          </p>
          <p className="text-xs text-text-secondary">
            Or run <code className="font-mono text-[11px]">npm run admin:create</code> against the
            database directly.
          </p>
        </div>

        <Link href="/auth/login" className="block text-center text-sm text-primary font-medium hover:text-primary-dark">
          Back to sign in
        </Link>
      </div>
    );
  }

  const needsToken = status.mode === 'recovery' || status.tokenConfigured;

  return (
    <form onSubmit={handleSubmit} className="bg-surface rounded-2xl border border-border p-8 space-y-5">
      {status.mode === 'bootstrap' && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-semibold text-text-primary">First-time setup</p>
          <p className="text-xs text-text-secondary mt-1">
            No administrator exists yet. The account you create here will be the first, and this
            page closes itself once it does.
          </p>
        </div>
      )}

      {status.mode === 'recovery' && (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
          <p className="text-sm font-semibold text-text-primary">Recovery mode</p>
          <p className="text-xs text-text-secondary mt-1">
            An administrator already exists. Enter the setup token to create another or reset an
            existing one&apos;s password.
          </p>
        </div>
      )}

      {needsToken && (
        <div>
          <label htmlFor="setup-token" className="block text-sm font-medium text-text-primary mb-2">
            Setup token *
          </label>
          <input
            id="setup-token"
            type="password"
            required
            value={setupToken}
            onChange={e => setSetupToken(e.target.value)}
            placeholder="Value of ADMIN_SETUP_TOKEN"
            autoComplete="off"
            className="w-full px-4 py-3 border border-border rounded-xl text-sm font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>
      )}

      <div>
        <label htmlFor="setup-name" className="block text-sm font-medium text-text-primary mb-2">
          Full name
        </label>
        <input
          id="setup-name"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name"
          autoComplete="name"
          className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
        />
      </div>

      <div>
        <label htmlFor="setup-email" className="block text-sm font-medium text-text-primary mb-2">
          Email *
        </label>
        <input
          id="setup-email"
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
        />
        <p className="text-xs text-text-muted mt-1.5">
          An existing account with this email becomes an administrator and has its password reset.
        </p>
      </div>

      <div>
        <PasswordField
          id="setup-password"
          label="Password *"
          required
          value={password}
          onChange={value => { setTouched(true); setPassword(value); }}
          placeholder="Choose a strong password"
          autoComplete="new-password"
        />
        <PasswordChecklist value={password} />
      </div>

      <PasswordField
        id="setup-confirm"
        label="Confirm password *"
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
        disabled={submitting}
        className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
      >
        {submitting ? 'Working…' : status.mode === 'bootstrap' ? 'Create administrator' : 'Restore admin access'}
      </button>
    </form>
  );
}
