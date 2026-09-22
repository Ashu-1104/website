'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import MediaCard, { type CommunityFeedItem, type CommunityReaction } from '@/components/community/MediaCard';
import VirtualizedMasonry from '@/components/community/VirtualizedMasonry';
import CommunityFeedModal from '@/components/community/CommunityFeedModal';
import CommunitySeoBlock from '@/components/community/CommunitySeoBlock';

const PAGE_SIZE = 60;

const sampleVideos = [
  'https://assets.modelslab.com/generations/6440aae4-3a9e-4b83-8935-efdbf6d5314a.mp4',
  'https://assets.modelslab.com/generations/2c71061a-4f01-412b-880f-736fc6b9cc2c.mp4',
  'https://assets.modelslab.com/generations/4cc7e3d5-31db-47b7-b89f-e4ad682babe0.mp4',
  'https://assets.modelslab.com/generations/3be6ae55-cadb-4ac7-a6c9-4e165f339eeb.mp4',
  'https://assets.modelslab.com/generations/1f18d043-0de7-4af2-8e76-9b760130bad5.mp4',
];

const ratioPool: Array<{ width: number; height: number }> = [
  // square
  { width: 1024, height: 1024 },
  // portrait
  { width: 832, height: 1216 },
  { width: 768, height: 1152 },
  // landscape
  { width: 1216, height: 832 },
  { width: 1280, height: 720 },
];

function makeBlurDataUrl(seed: number) {
  const hue = seed % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="hsl(${hue} 90% 60%)"/><stop offset="1" stop-color="hsl(${(hue + 40) % 360} 90% 55%)"/></linearGradient></defs><rect width="32" height="32" fill="url(#g)"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function makeMockFeed(count: number): CommunityFeedItem[] {
  const items: CommunityFeedItem[] = [];

  for (let i = 0; i < count; i += 1) {
    const ratio = ratioPool[i % ratioPool.length];
    const isVideo = i % 6 === 0; // ~16% videos
    const id = `mock-${i}`;

    items.push({
      id,
      caption: isVideo ? 'Short video' : 'Generated image',
      createdAt: new Date(Date.now() - i * 60_000).toISOString(),
      asset: {
        type: isVideo ? 'VIDEO' : 'IMAGE',
        url: isVideo ? sampleVideos[i % sampleVideos.length] : '/images/placeholder.svg',
        posterUrl: isVideo ? '/images/placeholder.svg' : undefined,
        thumbnailUrl: '/images/placeholder.svg',
        blurDataUrl: makeBlurDataUrl(i * 19),
        width: ratio.width,
        height: ratio.height,
        durationSeconds: isVideo ? 6 : undefined,
      },
    });
  }

  return items;
}

type ApiFeedResponse = {
  items: Array<{
    id: string;
    caption: string | null;
    prompt: string | null;
    createdAt: string;
    creator?: { id: string; handle: string | null };
    asset: {
      type: 'IMAGE' | 'VIDEO';
      width: number;
      height: number;
      durationSeconds?: number | null;
      blurDataUrl?: string | null;
      url?: string | null;
      posterUrl?: string | null;
      previewUrl?: string | null;
      thumbUrl?: string | null;
    };
    reactions?: Array<{ emoji: string; count: number }>;
  }>;
  nextCursor: string | null;
};

function mapApiItem(item: ApiFeedResponse['items'][number]): CommunityFeedItem {
  return {
    id: item.id,
    caption: item.caption,
    prompt: item.prompt,
    createdAt: item.createdAt,
    creator: item.creator,
    asset: {
      type: item.asset.type,
      url: item.asset.url ?? null,
      posterUrl: item.asset.posterUrl ?? undefined,
      previewUrl: item.asset.previewUrl ?? undefined,
      thumbUrl: item.asset.thumbUrl ?? undefined,
      thumbnailUrl: item.asset.thumbUrl ?? item.asset.posterUrl ?? item.asset.url ?? undefined,
      blurDataUrl: item.asset.blurDataUrl ?? undefined,
      width: item.asset.width,
      height: item.asset.height,
      durationSeconds: item.asset.durationSeconds ?? undefined,
    },
    reactions: item.reactions ?? [],
  };
}

export default function CommunityFeed() {
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);


  const mockItems = useMemo(() => makeMockFeed(350), []);
  const [dbItems, setDbItems] = useState<CommunityFeedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [usingMock, setUsingMock] = useState(false);
  const [mockLoadedCount, setMockLoadedCount] = useState(0);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const items = useMemo(
    () => (usingMock ? mockItems.slice(0, mockLoadedCount) : dbItems),
    [dbItems, mockItems, mockLoadedCount, usingMock]
  );
  const hasMore = usingMock ? mockLoadedCount < mockItems.length : Boolean(nextCursor);

  const [selectedItem, setSelectedItem] = useState<CommunityFeedItem | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const handleReactionsChange = useCallback((itemId: string, reactions: CommunityReaction[]) => {
    setDbItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, reactions } : item
      )
    );
  }, []);

  const loadPage = async (cursor?: string | null) => {
    const url = cursor
      ? `/api/community/feed?limit=${PAGE_SIZE}&cursor=${encodeURIComponent(cursor)}`
      : `/api/community/feed?limit=${PAGE_SIZE}`;
    const res = await fetch(url);
    const data = (await res.json()) as Partial<ApiFeedResponse> & { error?: string };

    if (!res.ok || !Array.isArray(data.items)) {
      throw new Error(data.error ?? 'Failed to load feed');
    }
    return {
      items: data.items.map(mapApiItem),
      nextCursor: typeof data.nextCursor === 'string' ? data.nextCursor : null,
    };
  };

  // Load the first page from the DB; fall back to mock data if the backend isn't ready yet.
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      setLoadingInitial(true);
      try {
        const page = await loadPage(null);
        if (cancelled) return;
        setDbItems(page.items);
        setNextCursor(page.nextCursor);
        setUsingMock(false);
        setMockLoadedCount(0);
      } catch {
        if (cancelled) return;
        setDbItems([]);
        setNextCursor(null);
        setUsingMock(true);
        setMockLoadedCount(Math.min(PAGE_SIZE, mockItems.length));
      } finally {
        if (!cancelled) setLoadingInitial(false);
      }
    };

    void init();
    return () => {
      cancelled = true;
    };
  }, [mockItems]);

  // Infinite loading: fetch the next page as the user approaches the bottom.
  useEffect(() => {
    if (!hasMore) return;
    if (!sentinelRef.current) return;

    const element = sentinelRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (loadingMore) return;

        setLoadingMore(true);
        if (usingMock) {
          setMockLoadedCount((current) => Math.min(mockItems.length, current + PAGE_SIZE));
          setLoadingMore(false);
          return;
        }

        void loadPage(nextCursor)
          .then((page) => {
            setDbItems((current) => [...current, ...page.items]);
            setNextCursor(page.nextCursor);
          })
          .catch(() => {
            // Ignore paging failures (user can refresh); keep the UI responsive.
          })
          .finally(() => setLoadingMore(false));
      },
      { root: null, rootMargin: '200px 0px', threshold: 0.01 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, mockItems.length, nextCursor, usingMock]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-white md:text-3xl">
            AI Art Community — Share &amp; Discover Uncensored AI Generated Art
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Real-time feed of AI-generated art, NSFW images, and AI videos from the Veloura.ai community. Tap any
            post to see the prompt, model, and settings. Remix in one click.
          </p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-text-secondary">
          {usingMock ? `Mock data · ${items.length}/${mockItems.length}` : `Database · ${items.length}`} items
        </div>
      </div>

      <VirtualizedMasonry
        items={items}
        getKey={(item) => item.id}
        getSize={(item) => {
          const { width, height } = item.asset;
          // If dimensions are placeholder (0x0), use a default square ratio
          if (width <= 0 || height <= 0) return { width: 1, height: 1 };
          return { width, height };
        }}
        getPrefetchUrl={(item) =>
          item.asset.type === 'IMAGE'
            ? item.asset.thumbUrl ?? item.asset.thumbnailUrl ?? item.asset.posterUrl ?? item.asset.url
            : null
        }
        renderItem={(item, meta) => (
          <MediaCard
            item={item}
            priority={meta.priority}
            isNearViewport={meta.isNearViewport}
            activeVideoId={activeVideoId}
            setActiveVideoId={setActiveVideoId}
            onOpen={(clicked) => {
              // Stop any playing hover-preview video before opening the modal.
              setActiveVideoId(null);
              setSelectedItem(clicked);
            }}
            onReactionsChange={handleReactionsChange}
          />
        )}
      />

      {!loadingInitial && !usingMock && items.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-text-secondary">
          No community posts yet.
        </div>
      )}

      {hasMore && (
        <div ref={sentinelRef} className="flex items-center justify-center py-6 text-sm text-text-secondary">
          {loadingMore ? 'Loading more…' : 'Scroll for more'}
        </div>
      )}

      {loadingInitial && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-text-secondary">
          Loading feed…
        </div>
      )}

      <CommunityFeedModal
        open={Boolean(selectedItem)}
        itemId={selectedItem?.id ?? null}
        initialItem={selectedItem}
        onClose={() => setSelectedItem(null)}
        onReactionsChange={handleReactionsChange}
      />

      <CommunitySeoBlock />
    </section>
  );
}
