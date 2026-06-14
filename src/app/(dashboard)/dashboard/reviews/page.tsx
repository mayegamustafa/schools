'use client';

import useSWR from 'swr';
import { useApp } from '@/context/AppContext';
import { formatDate } from '@/utils/helpers';

interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  content: string;
  isFlagged: boolean;
  createdAt: string;
}

interface SchoolInfo {
  id: string;
  name: string;
  status: string;
}

const fetcher = async ([url, token]: [string, string]) => {
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed');
  return data;
};

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className={`w-3.5 h-3.5 ${i < rating ? 'text-accent' : 'text-border'}`}
          fill={i < rating ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
      ))}
    </div>
  );
}

export default function DashboardReviewsPage() {
  const { token } = useApp();

  const { data: schoolData } = useSWR<SchoolInfo>(
    token ? ['/api/dashboard/info', token] : null,
    fetcher
  );

  const { data: reviewData, isLoading, error } = useSWR<{ reviews: Review[]; total: number }>(
    token && schoolData?.id ? [`/api/reviews?schoolId=${schoolData.id}`, token] : null,
    fetcher,
    { refreshInterval: 60000 }
  );

  const reviews = reviewData?.reviews ?? [];
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const ratingCounts = [5, 4, 3, 2, 1].map(n => ({
    star: n,
    count: reviews.filter(r => r.rating === n).length,
  }));

  if (isLoading && !reviewData) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface rounded-2xl border border-border p-5 animate-pulse">
            <div className="h-4 bg-hover rounded w-1/3 mb-3" />
            <div className="h-3 bg-hover rounded w-full mb-2" />
            <div className="h-3 bg-hover rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center">
        <p className="text-error text-sm">Failed to load reviews. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Reviews</h1>
        <p className="text-text-secondary mt-1">Parent and community reviews of your school.</p>
      </div>

      {/* Summary */}
      {reviews.length > 0 && (
        <div className="bg-surface rounded-2xl border border-border p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="text-center sm:text-left">
              <p className="text-5xl font-bold text-text-primary">{averageRating.toFixed(1)}</p>
              <Stars rating={Math.round(averageRating)} />
              <p className="text-xs text-text-muted mt-1">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex-1 space-y-1.5">
              {ratingCounts.map(({ star, count }) => (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-xs text-text-muted w-4 text-right">{star}</span>
                  <svg className="w-3 h-3 text-accent flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                  </svg>
                  <div className="flex-1 h-2 bg-hover rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all"
                      style={{ width: reviews.length > 0 ? `${(count / reviews.length) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="text-xs text-text-muted w-4">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Review list */}
      {reviews.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-border p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
          </div>
          <p className="text-sm font-medium text-text-primary">No reviews yet</p>
          <p className="text-xs text-text-muted mt-1">Reviews from parents and visitors will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(review => (
            <div key={review.id}
              className={`bg-surface rounded-2xl border p-5 transition-colors ${review.isFlagged ? 'border-error/30 bg-error/3' : 'border-border'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-text-primary">{review.title}</p>
                    {review.isFlagged && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-error/10 text-error">
                        Flagged
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Stars rating={review.rating} />
                    <span className="text-xs text-text-muted">by {review.userName}</span>
                    <span className="text-xs text-text-muted">·</span>
                    <span className="text-xs text-text-muted">{formatDate(review.createdAt)}</span>
                  </div>
                </div>
                <span className={`text-lg font-bold flex-shrink-0 ${review.rating >= 4 ? 'text-success' : review.rating >= 3 ? 'text-accent' : 'text-error'}`}>
                  {review.rating}/5
                </span>
              </div>
              <p className="text-sm text-text-secondary mt-3 leading-relaxed">{review.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
