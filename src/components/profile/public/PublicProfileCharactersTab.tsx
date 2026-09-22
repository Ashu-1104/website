'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

type APICharacter = {
  id: string;
  name: string;
  description: string | null;
  characterAvatarUrl?: string | null;
  avatarAsset: { url: string | null } | null;
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

export default function PublicProfileCharactersTab({ userId }: { userId: string }) {
  const [items, setItems] = useState<APICharacter[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildUrl = useCallback((cursor: string | null) => {
    const params = new URLSearchParams();
    params.set('userId', userId);
    params.set('limit', '24');
    if (cursor) params.set('cursor', cursor);
    return `/api/characters?${params.toString()}`;
  }, [userId]);

  const loadInitial = useCallback(async () => {
    setLoadingInitial(true);
    setError(null);
    try {
      const response = await fetch(buildUrl(null));
      if (!response.ok) {
        setError('Failed to load AI partners.');
        return;
      }
      const data = (await response.json()) as { items?: APICharacter[]; nextCursor?: string | null };
      setItems(Array.isArray(data.items) ? data.items : []);
      setNextCursor(typeof data.nextCursor === 'string' ? data.nextCursor : null);
    } catch {
      setError('Failed to load AI partners.');
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
      const data = (await response.json()) as { items?: APICharacter[]; nextCursor?: string | null };
      const nextItems = Array.isArray(data.items) ? data.items : [];
      setItems((prev) => [...prev, ...nextItems]);
      setNextCursor(typeof data.nextCursor === 'string' ? data.nextCursor : null);
    } catch {
      setError('Failed to load more.');
    } finally {
      setLoadingMore(false);
    }
  }, [buildUrl, loadingMore, nextCursor]);

  const gridItems = useMemo(() => {
    return items.map((partner) => {
      const imageUrl = partner.characterAvatarUrl || partner.avatarAsset?.url || '/images/placeholder.svg';
      const unoptimized = imageUrl.startsWith('data:');

      return (
        <Link key={partner.id} href={`/chat/${partner.id}`} className="gallery-item gallery-item-character">
          <Image
            src={imageUrl}
            alt={partner.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
            className="gallery-item-image"
            unoptimized={unoptimized}
          />
          <div className="gallery-item-overlay">
            <p className="gallery-item-name">{partner.name}</p>
            {partner.description ? <p className="gallery-item-description">{partner.description}</p> : null}
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
        title="No AI partners yet"
        subtitle="This user hasn't shared any AI partners yet."
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
