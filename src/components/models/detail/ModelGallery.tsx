'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Plus, Smile } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTimeAgo } from '@/lib/format';
import { useLocalUser } from '@/components/community/useLocalUser';
import CommunityFeedModal from '@/components/community/CommunityFeedModal';

type SortOption = 'newest' | 'oldest' | 'mostLiked';

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'newest', label: 'Newest' },
  { value: 'mostLiked', label: 'Most liked' },
  { value: 'oldest', label: 'Oldest' },
];

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '⚡'] as const;

type Reaction = { emoji: string; count: number };

interface GalleryItem {
  id: string;
  imageUrl: string;
  caption: string | null;
  prompt: string | null;
  likeCount: number;
  createdAt: string;
  creator: { id: string; handle: string | null; avatarUrl: string | null };
  assetType: 'IMAGE' | 'VIDEO';
  reactions: Reaction[];
}

const ABSOLUTE_URL_REGEX = /^https?:\/\//i;

function EmojiPicker(props: {
  itemId: string;
  reactions: Reaction[];
  onReact: (itemId: string, reactions: Reaction[]) => void;
}) {
  const { itemId, reactions, onReact } = props;
  const { headers } = useLocalUser();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    if (!pickerOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [pickerOpen]);

  const handleReact = async (emoji: string) => {
    if (busy) return;

    // Optimistic update
    const existing = reactions.find((r) => r.emoji === emoji);
    const optimistic = existing
      ? reactions.map((r) => r.emoji === emoji ? { ...r, count: r.count + 1 } : r)
      : [...reactions, { emoji, count: 1 }];
    onReact(itemId, optimistic);

    try {
      setBusy(true);
      const res = await fetch(`/api/community/items/${itemId}/reactions`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      });
      const data = (await res.json()) as { reactions?: Reaction[] };
      if (res.ok && Array.isArray(data.reactions)) {
        onReact(itemId, data.reactions);
      }
    } catch {
      // Keep optimistic
    } finally {
      setBusy(false);
      setPickerOpen(false);
    }
  };

  const visibleReactions = reactions.filter((r) => r.count > 0);

  return (
    <div ref={containerRef} className="absolute bottom-2 left-2 right-2 z-10 flex items-end gap-1.5">
      {/* + emoji button (always first) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setPickerOpen((prev) => !prev);
        }}
        className="inline-flex items-center gap-0.5 rounded-full bg-black/60 px-1.5 py-1 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/80 hover:text-white"
        aria-label="Add reaction"
      >
        <Plus className="h-3 w-3" />
        <Smile className="h-3.5 w-3.5" />
      </button>

      {/* Existing reactions */}
      {visibleReactions.map((r) => (
        <span
          key={r.emoji}
          className="inline-flex items-center gap-0.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[11px] backdrop-blur-sm"
        >
          <span>{r.emoji}</span>
          <span className="text-white/80">{r.count}</span>
        </span>
      ))}

      {/* Emoji picker dropdown */}
      {pickerOpen && (
        <div
          className="absolute bottom-full left-0 mb-1.5 flex items-center gap-1 rounded-full border border-white/15 bg-black/80 px-2 py-1.5 shadow-lg backdrop-blur-md"
          onClick={(e) => e.stopPropagation()}
        >
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              disabled={busy}
              onClick={() => void handleReact(emoji)}
              className="rounded-full p-1 text-base transition-transform hover:scale-125 hover:bg-white/10 disabled:opacity-50"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ModelGallery({ modelId }: { modelId: string }) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>('newest');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const fetchGallery = useCallback(async (cursor?: string) => {
    try {
      const params = new URLSearchParams({
        modelId,
        limit: '20',
      });
      if (cursor) params.set('cursor', cursor);

      const res = await fetch(`/api/community/feed?${params.toString()}`);
      if (!res.ok) return;

      const data = await res.json();
      const newItems: GalleryItem[] = (data.items ?? []).map((item: Record<string, unknown>) => {
        const asset = item.asset as Record<string, unknown> | undefined;
        const user = item.user as Record<string, unknown> | undefined;
        const creator = item.creator as Record<string, unknown> | undefined;

        // Build image URL from asset
        let imageUrl = '';
        if (asset) {
          const url = (asset.url as string) ?? '';
          const posterUrl = (asset.posterUrl as string) ?? '';
          const r2Key = (asset.r2Key as string) ?? '';
          if (url && ABSOLUTE_URL_REGEX.test(url)) {
            imageUrl = url;
          } else if (posterUrl && ABSOLUTE_URL_REGEX.test(posterUrl)) {
            imageUrl = posterUrl;
          } else if (r2Key && ABSOLUTE_URL_REGEX.test(r2Key)) {
            imageUrl = r2Key;
          } else {
            imageUrl = url || posterUrl || '';
          }
        }

        // Parse reactions from API
        const rawReactions = Array.isArray(item.reactions) ? item.reactions : [];
        const reactions: Reaction[] = rawReactions.map((r: Record<string, unknown>) => ({
          emoji: (r.emoji as string) ?? '',
          count: (r.count as number) ?? 0,
        }));

        return {
          id: item.id as string,
          imageUrl,
          caption: (item.caption as string) ?? null,
          prompt: (item.prompt as string) ?? null,
          likeCount: (item.likeCount as number) ?? 0,
          createdAt: (item.createdAt as string) ?? '',
          creator: {
            id: (creator?.id as string) ?? (user?.id as string) ?? '',
            handle: (creator?.handle as string) ?? (user?.handle as string) ?? null,
            avatarUrl: (user?.avatarUrl as string) ?? null,
          },
          assetType: ((asset?.type as string) ?? 'IMAGE') as 'IMAGE' | 'VIDEO',
          reactions,
        };
      });

      if (cursor) {
        setItems((prev) => [...prev, ...newItems]);
      } else {
        setItems(newItems);
      }
      setNextCursor(data.nextCursor ?? null);
    } catch {
      // Silently fail - gallery is optional
    }
  }, [modelId]);

  useEffect(() => {
    setLoading(true);
    fetchGallery().finally(() => setLoading(false));
  }, [fetchGallery]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    await fetchGallery(nextCursor);
    setLoadingMore(false);
  };

  const handleReactionsChange = useCallback((itemId: string, reactions: Reaction[]) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, reactions } : item
      )
    );
  }, []);

  const sortedItems = useMemo(() => {
    const list = [...items];
    if (sort === 'mostLiked') return list.sort((a, b) => b.likeCount - a.likeCount);
    if (sort === 'oldest')
      return list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [items, sort]);

  // Don't render section at all if there are no gallery items
  if (!loading && items.length === 0) return null;

  return (
    <section className={cn('model-detail-section-card', 'model-detail-gallery')} aria-label="Gallery">
      <div className="model-detail-gallery-header">
        <h2 className="model-detail-section-title">Gallery</h2>
        <label className="model-detail-sort">
          <span className="sr-only">Sort gallery</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="model-detail-sort-select"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <div className="model-detail-gallery-loading">
          <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
          <span>Loading gallery...</span>
        </div>
      ) : (
        <>
          <div className="model-detail-gallery-grid">
            {sortedItems.map((item) => (
              <article key={item.id} className="model-detail-gallery-card" style={{ cursor: 'pointer' }} onClick={() => setSelectedItemId(item.id)}>
                <header className="model-detail-gallery-card-header">
                  <div className="flex items-center gap-3 min-w-0">
                    <Image
                      src={item.creator.avatarUrl ?? '/images/placeholder.svg'}
                      alt=""
                      width={40}
                      height={40}
                      className="rounded-full border border-white/10 object-cover aspect-square flex-shrink-0"
                      unoptimized={(item.creator.avatarUrl ?? '').startsWith('data:')}
                    />
                    <div className="min-w-0">
                      <p className="model-detail-gallery-user" title={item.creator.handle ?? 'User'}>
                        {item.creator.handle ?? 'User'}
                      </p>
                      <p className="model-detail-gallery-time">{formatTimeAgo(item.createdAt)}</p>
                    </div>
                  </div>
                </header>
                <div className="model-detail-gallery-image relative">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.caption ?? item.prompt ?? 'Gallery image'}
                      width={512}
                      height={512}
                      sizes="(max-width: 768px) 90vw, (max-width: 1200px) 45vw, 25vw"
                      style={{ width: '100%', height: 'auto' }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-32 text-text-muted text-sm">
                      No image
                    </div>
                  )}
                  <EmojiPicker
                    itemId={item.id}
                    reactions={item.reactions}
                    onReact={handleReactionsChange}
                  />
                </div>
              </article>
            ))}
          </div>

          {nextCursor && (
            <div className="model-detail-gallery-load-more">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="model-detail-gallery-load-more-btn"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load more'
                )}
              </button>
            </div>
          )}
        </>
      )}
      <CommunityFeedModal
        open={!!selectedItemId}
        itemId={selectedItemId}
        onClose={() => setSelectedItemId(null)}
        onReactionsChange={handleReactionsChange}
      />
    </section>
  );
}
