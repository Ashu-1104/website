'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { useUser } from '@/context/UserContext';

type MediaType = 'IMAGE' | 'VIDEO';

type MediaItem = {
  id: string;
  title: string | null;
  prompt: string | null;
  createdAt: string;
  asset: {
    id: string;
    type: MediaType;
    url: string | null;
    width: number;
    height: number;
    durationSeconds: number | null;
    posterUrl: string | null;
    previewUrl: string | null;
  };
};

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) return null;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function ProfileEmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="gallery-empty-state">
      <h3 className="gallery-empty-title">{title}</h3>
      <p className="gallery-empty-subtitle">{subtitle}</p>
    </div>
  );
}

export default function PublicProfileMediaTab({
  userId,
  type,
}: {
  userId: string;
  type: MediaType;
}) {
  const { headers } = useUser();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildUrl = useCallback(
    (cursor: string | null) => {
      const params = new URLSearchParams();
      params.set('type', type);
      params.set('limit', '24');
      if (cursor) params.set('cursor', cursor);
      return `/api/user/${userId}/media?${params.toString()}`;
    },
    [type, userId]
  );

  const loadInitial = useCallback(async () => {
    if (!userId) return;
    setLoadingInitial(true);
    setError(null);
    try {
      const response = await fetch(buildUrl(null), { headers });
      if (!response.ok) {
        setError('Failed to load media.');
        return;
      }
      const data = (await response.json()) as { items?: MediaItem[]; nextCursor?: string | null };
      setItems(Array.isArray(data.items) ? data.items : []);
      setNextCursor(typeof data.nextCursor === 'string' ? data.nextCursor : null);
    } catch {
      setError('Failed to load media.');
    } finally {
      setLoadingInitial(false);
    }
  }, [buildUrl, headers, userId]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const response = await fetch(buildUrl(nextCursor), { headers });
      if (!response.ok) {
        setError('Failed to load more.');
        return;
      }
      const data = (await response.json()) as { items?: MediaItem[]; nextCursor?: string | null };
      const nextItems = Array.isArray(data.items) ? data.items : [];
      setItems((prev) => [...prev, ...nextItems]);
      setNextCursor(typeof data.nextCursor === 'string' ? data.nextCursor : null);
    } catch {
      setError('Failed to load more.');
    } finally {
      setLoadingMore(false);
    }
  }, [buildUrl, headers, loadingMore, nextCursor]);

  const isVideo = type === 'VIDEO';

  const gridItems = useMemo(() => {
    return items.map((item) => {
      const url = item.asset.previewUrl || item.asset.posterUrl || item.asset.url || '/images/placeholder.svg';
      const unoptimized = url.startsWith('data:');
      const durationLabel = isVideo ? formatDuration(item.asset.durationSeconds) : null;
      const overlayText = item.prompt?.trim() || item.title?.trim() || '';

      return (
        <div key={item.id} className={cn('gallery-item', isVideo && 'gallery-item-video')}>
          <Image
            src={url}
            alt={overlayText || (isVideo ? 'Video' : 'Image')}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
            className="gallery-item-image"
            unoptimized={unoptimized}
          />

          {isVideo ? (
            <>
              <div className="gallery-item-play" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              {durationLabel ? <div className="gallery-item-duration">{durationLabel}</div> : null}
            </>
          ) : null}

          {overlayText ? (
            <div className="gallery-item-overlay">
              <p className="gallery-item-prompt">{overlayText}</p>
            </div>
          ) : null}
        </div>
      );
    });
  }, [isVideo, items]);

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
        title={isVideo ? 'No videos yet' : 'No images yet'}
        subtitle={isVideo ? "This user hasn't shared any videos yet." : "This user hasn't shared any images yet."}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="gallery-grid">{gridItems}</div>

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
