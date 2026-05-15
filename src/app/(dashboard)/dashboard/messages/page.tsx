'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useApp } from '@/context/AppContext';
import { Conversation } from '@/types';

const fetcher = async ([url, token]: [string, string]) => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const payload = await res.json();
  if (!res.ok) throw new Error(payload.error || 'Failed to load conversations');
  return payload as { conversations: Conversation[] };
};

export default function DashboardMessagesPage() {
  const { token, showToast } = useApp();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const { data, error, isLoading, mutate } = useSWR(token ? ['/api/conversations', token] : null, fetcher, {
    refreshInterval: 15000,
  });

  useEffect(() => {
    if (!activeConversationId && data?.conversations[0]) {
      setActiveConversationId(data.conversations[0].id);
    }
  }, [activeConversationId, data]);

  const { data: threadData, mutate: mutateThread } = useSWR(
    token && activeConversationId ? [`/api/conversations/${activeConversationId}`, token] : null,
    fetcher,
    { refreshInterval: 10000 }
  );

  const sendMessage = async () => {
    if (!token || !activeConversationId || !draft.trim()) return;

    try {
      const res = await fetch(`/api/conversations/${activeConversationId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: draft }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to send message');
      setDraft('');
      await Promise.all([mutate(), mutateThread()]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to send message', 'error');
    }
  };

  const closeConversation = async () => {
    if (!token || !activeConversationId) return;
    try {
      const res = await fetch(`/api/conversations/${activeConversationId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'closed' }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Unable to close conversation');
      await Promise.all([mutate(), mutateThread()]);
      showToast('Conversation closed', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to close conversation', 'error');
    }
  };

  if (!token) return <p className="text-text-secondary">Sign in with a school account to manage messages.</p>;
  if (isLoading && !data) return <p className="text-text-secondary">Loading conversations...</p>;
  if (error || !data) return <p className="text-error">{error instanceof Error ? error.message : 'Unable to load messages'}</p>;

  const thread = (threadData as { conversation?: Conversation } | undefined)?.conversation || null;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Messages</h1>
        <p className="text-text-secondary mt-1">Respond to parents and prospective students from one inbox.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-6">
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          {data.conversations.length === 0 ? (
            <p className="p-5 text-sm text-text-secondary">No conversations yet.</p>
          ) : data.conversations.map(conversation => (
            <button
              key={conversation.id}
              type="button"
              onClick={() => setActiveConversationId(conversation.id)}
              className={`w-full text-left px-5 py-4 border-b border-border last:border-b-0 transition-colors ${conversation.id === activeConversationId ? 'bg-primary/5' : 'hover:bg-gray-50'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text-primary">{conversation.userName}</p>
                  <p className="text-xs text-text-secondary mt-1">{conversation.subject}</p>
                </div>
                <span className={`text-[11px] px-2 py-1 rounded-full ${conversation.status === 'open' ? 'bg-secondary/10 text-secondary' : 'bg-gray-100 text-text-secondary'}`}>{conversation.status}</span>
              </div>
              {conversation.lastMessage && <p className="text-xs text-text-muted mt-2 line-clamp-2">{conversation.lastMessage.content}</p>}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-border p-5 min-h-[520px] flex flex-col">
          {!thread ? (
            <div className="flex-1 flex items-center justify-center text-sm text-text-secondary">Select a conversation to view the thread.</div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-border">
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">{thread.subject}</h2>
                  <p className="text-sm text-text-secondary">With {thread.userName}</p>
                </div>
                {thread.status === 'open' && (
                  <button type="button" onClick={closeConversation} className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-gray-50 transition-colors">Close thread</button>
                )}
              </div>

              <div className="flex-1 py-4 space-y-3 overflow-y-auto">
                {(thread.messages || []).map(message => (
                  <div key={message.id} className={`max-w-xl rounded-2xl px-4 py-3 ${message.senderRole === 'school' ? 'ml-auto bg-primary text-white' : 'bg-gray-100 text-text-primary'}`}>
                    <p className="text-xs font-medium mb-1 opacity-80">{message.senderName}</p>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-border">
                <textarea
                  rows={4}
                  value={draft}
                  onChange={event => setDraft(event.target.value)}
                  placeholder={thread.status === 'closed' ? 'This conversation is closed.' : 'Reply to this conversation...'}
                  disabled={thread.status === 'closed'}
                  className="w-full px-4 py-3 border border-border rounded-xl text-sm resize-none disabled:bg-gray-50"
                />
                <div className="flex justify-end mt-3">
                  <button type="button" onClick={sendMessage} disabled={thread.status === 'closed' || !draft.trim()} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors">Send reply</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}