'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useApp } from '@/context/AppContext';

type UserRole = 'user' | 'school' | 'admin';

interface UsersResponse {
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: UserRole;
    createdAt: string;
  }>;
  total: number;
  page: number;
  pages: number;
}

const fetcher = async ([url, token]: [string, string]) => {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await res.json();
  if (!res.ok) throw new Error(payload.error || 'Failed to load users');
  return payload as UsersResponse;
};

export default function AdminUsersPage() {
  const { token, user, showToast } = useApp();
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<UserRole | 'all'>('all');
  const [pwModal, setPwModal] = useState<{ userId: string; name: string } | null>(null);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  const endpoint = `/api/users?q=${encodeURIComponent(query)}&role=${role}&limit=100`;
  const { data, error, isLoading, mutate } = useSWR(
    token ? [endpoint, token] : null,
    fetcher,
    { refreshInterval: 30000 }
  );

  const updateRole = async (targetUserId: string, nextRole: UserRole) => {
    if (!token) return;

    try {
      const res = await fetch(`/api/users/${targetUserId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: nextRole }),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Unable to update role');

      showToast('User role updated', 'success');
      await mutate();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to update role', 'error');
    }
  };

  const setPassword = async () => {
    if (!token || !pwModal) return;
    const pwRule = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!pwRule.test(newPw)) {
      showToast('Password must be 8+ chars with uppercase, lowercase, and a number', 'error');
      return;
    }
    if (newPw !== confirmPw) {
      showToast('Passwords do not match', 'error');
      return;
    }
    try {
      const res = await fetch(`/api/users/${pwModal.userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: newPw }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to set password');
      showToast(`Password updated for ${pwModal.name}`, 'success');
      setPwModal(null);
      setNewPw('');
      setConfirmPw('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to set password', 'error');
    }
  };

  const deleteUser = async (targetUserId: string, name: string) => {
    if (!token) return;

    if (!window.confirm(`Delete ${name}? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${targetUserId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Unable to delete user');

      showToast('User deleted successfully', 'success');
      await mutate();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to delete user', 'error');
    }
  };

  if (!token) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <h1 className="text-2xl font-bold text-text-primary mb-3">Admin access required</h1>
        <p className="text-text-secondary">Sign in with an admin account to manage users.</p>
      </div>
    );
  }

  if (isLoading && !data) return <p className="text-text-secondary">Loading users...</p>;
  if (error || !data) return <p className="text-error">{error instanceof Error ? error.message : 'Unable to load users'}</p>;

  return (
    <>
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Users</h1>
          <p className="text-text-secondary mt-1">Manage account roles and platform access.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name or email"
            className="px-3 py-2 text-sm border border-border rounded-lg"
          />
          <select
            value={role}
            onChange={e => setRole(e.target.value as UserRole | 'all')}
            className="px-3 py-2 text-sm border border-border rounded-lg bg-surface"
          >
            <option value="all">All roles</option>
            <option value="user">User</option>
            <option value="school">School</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">User Accounts</h2>
          <p className="text-sm text-text-secondary">{data.total} records</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-hover text-left">
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Joined</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-sm text-text-secondary text-center">No users found.</td>
                </tr>
              ) : data.users.map(account => {
                const isCurrentUser = user?.id === account.id;

                return (
                  <tr key={account.id} className="hover:bg-hover">
                    <td className="px-4 py-4">
                      <p className="text-sm font-medium text-text-primary">{account.name}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-text-secondary">{account.email}</td>
                    <td className="px-4 py-4">
                      <select
                        value={account.role}
                        onChange={e => updateRole(account.id, e.target.value as UserRole)}
                        className="px-2 py-1 text-sm border border-border rounded-lg bg-surface"
                        disabled={isCurrentUser}
                      >
                        <option value="user">User</option>
                        <option value="school">School</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-4 text-sm text-text-secondary">{new Date(account.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => { setPwModal({ userId: account.id, name: account.name }); setNewPw(''); setConfirmPw(''); }}
                          disabled={isCurrentUser}
                          className="text-sm text-primary hover:underline disabled:text-text-muted disabled:no-underline"
                        >
                          Set Password
                        </button>
                        <button
                          onClick={() => deleteUser(account.id, account.name)}
                          disabled={isCurrentUser}
                          className="text-sm text-error hover:underline disabled:text-text-muted disabled:no-underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>

      {pwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">Set password for <span className="text-primary">{pwModal.name}</span></h2>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">New Password</label>
              <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
                placeholder="Min 8 chars"
                className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Confirm Password</label>
              <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                placeholder="Repeat password"
                className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
            <p className="text-xs text-text-muted">Must be 8+ characters with uppercase, lowercase, and a number.</p>
            <div className="flex gap-3 pt-1">
              <button onClick={() => { setPwModal(null); setNewPw(''); setConfirmPw(''); }}
                className="flex-1 py-2.5 border border-border text-text-primary font-semibold rounded-xl hover:bg-hover transition-colors">
                Cancel
              </button>
              <button onClick={setPassword}
                className="flex-1 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors">
                Save Password
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
