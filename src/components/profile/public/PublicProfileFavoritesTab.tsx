'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Headphones, Image as ImageIcon, Users, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCompactNumber } from '@/lib/format';
import { useUser } from '@/context/UserContext';

type FavoriteCategory = 'images' | 'videos' | 'partners' | 'models' | 'ai-audio';

type FavoriteItem = {
  id: string;
  type: string;
  createdAt: string;
  item:
    | {
        id: string;
        type: string;
        url: string | null;
        width: number;
        height: number;
        durationSeconds: number | null;
        posterUrl: string | null;
        previewUrl: string | null;
      }
    | {
        id: string;
        name: string;
        thumbnailUrl: string | null;
        modelType: string;
        favoriteCount: number;
        likeCount: number;
      }
    | {
        id: string;
        name: string;
        description: string | null;
        style: string;
        characterAvatarUrl?: string | null;
        avatarAsset: { url: string | null } | null;
      }
    | null;
};

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) return null;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function EmptyState({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="gallery-empty-state">
      <h3 className="gallery-empty-title">{title}</h3>
      <p className="gallery-empty-subtitle">{subtitle}</p>
    </div>
  );
}

export default function PublicProfileFavoritesTab({
  userId,
  counts,
}: {
  userId: string;
  counts:
    | {
        images: number;
        videos: number;
        models: number;
        partners: number;
        aiAudio: number;
      }
    | undefined;
}) {
  const { headers } = useUser();
  const [category, setCategory] = useState<FavoriteCategory>('models');
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tabItems = useMemo(
    () => [
      { id: 'images' as const, label: 'Images', Icon: ImageIcon, count: counts?.images ?? 0 },
      { id: 'videos' as const, label: 'Videos', Icon: Video, count: counts?.videos ?? 0 },
      { id: 'partners' as const, label: 'AI Partners', Icon: Users, count: counts?.partners ?? 0 },
      { id: 'models' as const, label: 'Models', Icon: Box, count: counts?.models ?? 0 },
      { id: 'ai-audio' as const, label: 'AI Audio', Icon: Headphones, count: counts?.aiAudio ?? 0 },
    ],
    [counts?.aiAudio, counts?.images, counts?.models, counts?.partners, counts?.videos]
  );

  const apiType = useMemo(() => {
    if (category === 'images') return 'IMAGE';
    if (category === 'videos') return 'VIDEO';
    if (category === 'models') return 'MODEL';
    if (category === 'partners') return 'CHARACTER';
    return null;
  }, [category]);

  const buildUrl = useCallback(
    (cursor: string | null) => {
      const params = new URLSearchParams();
      if (apiType) params.set('type', apiType);
      params.set('limit', '24');
      if (cursor) params.set('cursor', cursor);
      return `/api/user/${userId}/favorites?${params.toString()}`;
    },
    [apiType, userId]
  );

  const loadInitial = useCallback(async () => {
    if (!apiType) {
      setItems([]);
      setNextCursor(null);
      setLoadingInitial(false);
      setError(null);
      return;
    }

    setLoadingInitial(true);
    setError(null);
    try {
      const response = await fetch(buildUrl(null), { headers });
      if (!response.ok) {
        setError('Failed to load favorites.');
        return;
      }
      const data = (await response.json()) as { items?: FavoriteItem[]; nextCursor?: string | null };
      setItems(Array.isArray(data.items) ? data.items : []);
      setNextCursor(typeof data.nextCursor === 'string' ? data.nextCursor : null);
    } catch {
      setError('Failed to load favorites.');
    } finally {
      setLoadingInitial(false);
    }
  }, [apiType, buildUrl, headers]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const loadMore = useCallback(async () => {
    if (!apiType || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const response = await fetch(buildUrl(nextCursor), { headers });
      if (!response.ok) {
        setError('Failed to load more.');
        return;
      }
      const data = (await response.json()) as { items?: FavoriteItem[]; nextCursor?: string | null };
      const nextItems = Array.isArray(data.items) ? data.items : [];
      setItems((prev) => [...prev, ...nextItems]);
      setNextCursor(typeof data.nextCursor === 'string' ? data.nextCursor : null);
    } catch {
      setError('Failed to load more.');
    } finally {
      setLoadingMore(false);
    }
  }, [apiType, buildUrl, headers, loadingMore, nextCursor]);

  const content = useMemo(() => {
    if (category === 'ai-audio') {
      return (
        <EmptyState
          title="No AI audio favorites yet"
          subtitle="Audio favorites will show up here once supported."
        />
      );
    }

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
        <EmptyState
          title="No favorites yet"
          subtitle="This user hasn't favorited anything in this category."
        />
      );
    }

    if (category === 'models') {
      return (
        <div className="profile-models-grid" aria-label="Favorite models">
          {items.map((fav) => {
            const model = fav.item as Extract<FavoriteItem['item'], { name: string; modelType: string }> | null;
            if (!model) return null;
            const imageUrl = model.thumbnailUrl || '/images/placeholder.svg';
            const unoptimized = imageUrl.startsWith('data:');
            const modelRouteId = (model as { slug?: string | null }).slug || model.id;
            return (
              <Link key={fav.id} href={`/models/${modelRouteId}`} className="ai-model-card profile-model-card">
                <div className="ai-model-card-media">
                  <Image
                    src={imageUrl}
                    alt={model.name}
                    fill
                    sizes="(max-width: 768px) 70vw, (max-width: 1200px) 35vw, 25vw"
                    className="ai-model-card-image"
                    unoptimized={unoptimized}
                  />
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
          })}
        </div>
      );
    }

    if (category === 'partners') {
      return (
        <div className="gallery-grid" aria-label="Favorite AI partners">
          {items.map((fav) => {
            const partner = fav.item as Extract<FavoriteItem['item'], { name: string; style: string }> | null;
            if (!partner) return null;
            const avatarUrl = partner.characterAvatarUrl || partner.avatarAsset?.url || '/images/placeholder.svg';
            const unoptimized = avatarUrl.startsWith('data:');
            return (
              <div key={fav.id} className="gallery-item gallery-item-character">
                <Image
                  src={avatarUrl}
                  alt={partner.name}
                  fill
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                  className="gallery-item-image"
                  unoptimized={unoptimized}
                />
                <div className="gallery-item-overlay">
                  <p className="gallery-item-name">{partner.name}</p>
                  {partner.description ? (
                    <p className="gallery-item-description">{partner.description}</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    const isVideo = category === 'videos';

    return (
      <div className="gallery-grid" aria-label={isVideo ? 'Favorite videos' : 'Favorite images'}>
        {items.map((fav) => {
          const media = fav.item as Extract<FavoriteItem['item'], { url: string | null }> | null;
          if (!media) return null;
          const url = media.previewUrl || media.posterUrl || media.url || '/images/placeholder.svg';
          const unoptimized = url.startsWith('data:');
          const durationLabel = isVideo ? formatDuration(media.durationSeconds) : null;
          return (
            <div key={fav.id} className={cn('gallery-item', isVideo && 'gallery-item-video')}>
              <Image
                src={url}
                alt={isVideo ? 'Video' : 'Image'}
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
            </div>
          );
        })}
      </div>
    );
  }, [category, error, items, loadingInitial]);

  return (
    <div className="space-y-5">
      <div className="profile-favorites-tabs" role="tablist" aria-label="Favorites categories">
        {tabItems.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={category === tab.id}
            className={cn('profile-favorites-tab', category === tab.id && 'profile-favorites-tab-active')}
            onClick={() => setCategory(tab.id)}
          >
            <tab.Icon className="profile-favorites-tab-icon" aria-hidden="true" />
            <span>{tab.label}</span>
            <span className="profile-favorites-tab-count">{formatCompactNumber(tab.count)}</span>
          </button>
        ))}
      </div>

      {content}

      {apiType && nextCursor && !loadingInitial ? (
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
