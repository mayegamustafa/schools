'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useApp } from '@/context/AppContext';
import { Conversation } from '@/types';

const fetcher = async ([url, token]: [string, string]) => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const payload = await res.json();
  if (!res.ok) throw new Error(payload.error || 'Failed to load conversations');
  return payload;
};

export default function UserMessagesPage() {
  const { token, user, showToast } = useApp();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const { data, error, isLoading, mutate } = useSWR(token ? ['/api/conversations', token] : null, fetcher, {
    refreshInterval: 15000,
  });

  useEffect(() => {
    if (!activeConversationId && data?.conversations?.[0]) {
      setActiveConversationId(data.conversations[0].id);
    }
  }, [activeConversationId, data]);

  const { data: threadData, mutate: mutateThread } = useSWR(
    token && activeConversationId ? [`/api/conversations/${activeConversationId}`, token] : null,
    fetcher,
    { refreshInterval: 10000 }
  );

  const sendReply = async () => {
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
      if (!res.ok) throw new Error(payload.error || 'Unable to send reply');
      setDraft('');
      await Promise.all([mutate(), mutateThread()]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to send reply', 'error');
    }
  };

  if (!token || user?.role !== 'user') {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-2xl font-bold text-text-primary mb-3">Messages require a user account</h1>
        <p className="text-text-secondary mb-6">Sign in to continue conversations with schools.</p>
        <Link href="/auth/login" className="inline-flex px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors">Sign In</Link>
      </div>
    );
  }

  if (isLoading && !data) return <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-text-secondary">Loading messages...</div>;
  if (error || !data) return <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-error">{error instanceof Error ? error.message : 'Unable to load messages'}</div>;

  const conversations = (data as { conversations: Conversation[] }).conversations;
  const thread = (threadData as { conversation?: Conversation } | undefined)?.conversation || null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Your Messages</h1>
        <p className="text-text-secondary mt-1">Follow up with schools you have contacted.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-6">
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          {conversations.length === 0 ? (
            <p className="p-5 text-sm text-text-secondary">No conversations yet. Visit a school profile to start one.</p>
          ) : conversations.map(conversation => (
            <button
              key={conversation.id}
              type="button"
              onClick={() => setActiveConversationId(conversation.id)}
              className={`w-full text-left px-5 py-4 border-b border-border last:border-b-0 transition-colors ${conversation.id === activeConversationId ? 'bg-primary/5' : 'hover:bg-gray-50'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text-primary">{conversation.schoolName}</p>
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
            <div className="flex-1 flex items-center justify-center text-sm text-text-secondary">Select a conversation to read and reply.</div>
          ) : (
            <>
              <div className="pb-4 border-b border-border">
                <h2 className="text-lg font-semibold text-text-primary">{thread.subject}</h2>
                <p className="text-sm text-text-secondary mt-1">Conversation with {thread.schoolName}</p>
              </div>

              <div className="flex-1 py-4 space-y-3 overflow-y-auto">
                {(thread.messages || []).map(message => (
                  <div key={message.id} className={`max-w-xl rounded-2xl px-4 py-3 ${message.senderRole === 'user' ? 'ml-auto bg-primary text-white' : 'bg-gray-100 text-text-primary'}`}>
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
                  placeholder={thread.status === 'closed' ? 'This conversation is closed.' : 'Write your reply...'}
                  disabled={thread.status === 'closed'}
                  className="w-full px-4 py-3 border border-border rounded-xl text-sm resize-none disabled:bg-gray-50"
                />
                <div className="flex justify-end mt-3">
                  <button type="button" onClick={sendReply} disabled={thread.status === 'closed' || !draft.trim()} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors">Send</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}