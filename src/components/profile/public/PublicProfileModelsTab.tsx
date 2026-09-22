'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { formatCompactNumber } from '@/lib/format';

type UploadedModel = {
  id: string;
  slug?: string | null;
  name: string;
  description: string | null;
  modelType: string;
  baseModel: string;
  thumbnailUrl: string | null;
  badge: string | null;
  favoriteCount: number;
  likeCount: number;
  createdAt: string;
};

function ProfileEmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="gallery-empty-state">
      <h3 className="gallery-empty-title">{title}</h3>
      <p className="gallery-empty-subtitle">{subtitle}</p>
    </div>
  );
}

export default function PublicProfileModelsTab({ userId }: { userId: string }) {
  const [items, setItems] = useState<UploadedModel[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildUrl = useCallback((cursor: string | null) => {
    const params = new URLSearchParams();
    params.set('userId', userId);
    params.set('limit', '20');
    if (cursor) params.set('cursor', cursor);
    return `/api/models?${params.toString()}`;
  }, [userId]);

  const loadInitial = useCallback(async () => {
    setLoadingInitial(true);
    setError(null);
    try {
      const response = await fetch(buildUrl(null));
      if (!response.ok) {
        setError('Failed to load models.');
        return;
      }
      const data = (await response.json()) as { items?: UploadedModel[]; nextCursor?: string | null };
      setItems(Array.isArray(data.items) ? data.items : []);
      setNextCursor(typeof data.nextCursor === 'string' ? data.nextCursor : null);
    } catch {
      setError('Failed to load models.');
    } finally {
      setLoadingInitial(false);
    }
  }, [buildUrl]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const response = await fetch(buildUrl(nextCursor));
      if (!response.ok) {
        setError('Failed to load more.');
        return;
      }
      const data = (await response.json()) as { items?: UploadedModel[]; nextCursor?: string | null };
      const nextItems = Array.isArray(data.items) ? data.items : [];
      setItems((prev) => [...prev, ...nextItems]);
      setNextCursor(typeof data.nextCursor === 'string' ? data.nextCursor : null);
    } catch {
      setError('Failed to load more.');
    } finally {
      setLoadingMore(false);
    }
  }, [buildUrl, loadingMore, nextCursor]);

  const cards = useMemo(() => {
    return items.map((model) => {
      const imageUrl = model.thumbnailUrl || '/images/placeholder.svg';
      const unoptimized = imageUrl.startsWith('data:');
      const modelRouteId = model.slug || model.id;
      return (
        <Link key={model.id} href={`/models/${modelRouteId}`} className="ai-model-card profile-model-card">
          <div className="ai-model-card-media">
            <Image
              src={imageUrl}
              alt={model.name}
              fill
              sizes="(max-width: 768px) 70vw, (max-width: 1200px) 35vw, 25vw"
              className="ai-model-card-image"
              unoptimized={unoptimized}
            />
            {model.badge ? <span className="ai-model-card-badge">{model.badge}</span> : null}
          </div>
          <div className="ai-model-card-footer">
            <h3 className="ai-model-card-title" title={model.name}>
              {model.name}
            </h3>
            <div className="ai-model-card-stats" aria-label="Model stats">
              <div className="ai-model-card-stat" aria-label="Favorites">
                {formatCompactNumber(model.favoriteCount)} favorites
              </div>
              <div className="ai-model-card-stat" aria-label="Likes">
                {formatCompactNumber(model.likeCount)} likes
              </div>
            </div>
          </div>
        </Link>
      );
    });
  }, [items]);

  if (loadingInitial) {
    return <div className="gallery-loading">Loading...</div>;
  }

  if (error) {
    return (
      <div className="gallery-empty-state">
        <h3 className="gallery-empty-title">Something went wrong</h3>
        <p className="gallery-empty-subtitle">{error}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <ProfileEmptyState
        title="No models yet"
        subtitle="This user hasn't uploaded any models yet."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="profile-models-grid">{cards}</div>

      {nextCursor ? (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className={cn(
              'rounded-xl border border-accent-pink/40 px-6 py-3 text-sm font-semibold text-white transition-colors',
              loadingMore ? 'opacity-60 cursor-not-allowed' : 'hover:bg-accent-pink/10'
            )}
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
