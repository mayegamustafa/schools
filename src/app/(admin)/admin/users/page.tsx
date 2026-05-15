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
            className="px-3 py-2 text-sm border border-border rounded-lg bg-white"
          >
            <option value="all">All roles</option>
            <option value="user">User</option>
            <option value="school">School</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">User Accounts</h2>
          <p className="text-sm text-text-secondary">{data.total} records</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left">
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
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <p className="text-sm font-medium text-text-primary">{account.name}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-text-secondary">{account.email}</td>
                    <td className="px-4 py-4">
                      <select
                        value={account.role}
                        onChange={e => updateRole(account.id, e.target.value as UserRole)}
                        className="px-2 py-1 text-sm border border-border rounded-lg bg-white"
                        disabled={isCurrentUser}
                      >
                        <option value="user">User</option>
                        <option value="school">School</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-4 text-sm text-text-secondary">{new Date(account.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => deleteUser(account.id, account.name)}
                        disabled={isCurrentUser}
                        className="text-sm text-error hover:underline disabled:text-text-muted disabled:no-underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
