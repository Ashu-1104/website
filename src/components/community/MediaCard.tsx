'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Plus, Smile } from 'lucide-react';

import { cn } from '@/lib/utils';
import ProgressiveImage from '@/components/community/ProgressiveImage';
import { useHoverDevice } from '@/components/community/useHoverDevice';
import { useLocalUser } from '@/components/community/useLocalUser';

export type CommunityAsset = {
  type: 'IMAGE' | 'VIDEO';
  url: string | null;
  posterUrl?: string | null;
  thumbnailUrl?: string | null;
  thumbUrl?: string | null;
  previewUrl?: string | null;
  blurDataUrl?: string | null;
  width: number;
  height: number;
  durationSeconds?: number | null;
};

export type CommunityReaction = { emoji: string; count: number };

export type CommunityFeedItem = {
  id: string;
  caption?: string | null;
  prompt?: string | null;
  createdAt?: string;
  creator?: { id: string; handle: string | null };
  asset: CommunityAsset;
  reactions?: CommunityReaction[];
};

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '⚡'] as const;

const prefetchedVideoUrls = new Set<string>();

function prefetchVideoMetadata(url: string) {
  if (!url) return;
  if (prefetchedVideoUrls.has(url)) return;
  prefetchedVideoUrls.add(url);

  const video = document.createElement('video');
  video.preload = 'metadata';
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.load();
}

export default function MediaCard(props: {
  item: CommunityFeedItem;
  priority: boolean;
  isNearViewport: boolean;
  activeVideoId: string | null;
  setActiveVideoId: React.Dispatch<React.SetStateAction<string | null>>;
  onOpen: (item: CommunityFeedItem) => void;
  onReactionsChange?: (itemId: string, reactions: CommunityReaction[]) => void;
}) {
  const { item, priority, isNearViewport, activeVideoId, setActiveVideoId, onOpen, onReactionsChange } = props;
  const canHover = useHoverDevice();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { headers } = useLocalUser();

  const isVideo = item.asset.type === 'VIDEO';
  const isActiveVideo = isVideo && activeVideoId === item.id;
  const visibleReactions = useMemo(() => (item.reactions ?? []).filter((r) => r.count > 0), [item.reactions]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [reactionBusy, setReactionBusy] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker on outside click
  useEffect(() => {
    if (!pickerOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [pickerOpen]);

  const handleReact = async (emoji: string) => {
    if (reactionBusy || !onReactionsChange) return;
    const reactions = item.reactions ?? [];
    const existing = reactions.find((r) => r.emoji === emoji);
    const optimistic = existing
      ? reactions.map((r) => r.emoji === emoji ? { ...r, count: r.count + 1 } : r)
      : [...reactions, { emoji, count: 1 }];
    onReactionsChange(item.id, optimistic);

    try {
      setReactionBusy(true);
      const res = await fetch(`/api/community/items/${item.id}/reactions`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      });
      const data = (await res.json()) as { reactions?: CommunityReaction[] };
      if (res.ok && Array.isArray(data.reactions)) {
        onReactionsChange(item.id, data.reactions);
      }
    } catch {
      // Keep optimistic
    } finally {
      setReactionBusy(false);
      setPickerOpen(false);
    }
  };

  const posterSrc = useMemo(() => {
    return item.asset.posterUrl ?? item.asset.thumbnailUrl ?? '/images/placeholder.svg';
  }, [item.asset.posterUrl, item.asset.thumbnailUrl]);

  const fullSrc = useMemo(() => {
    return item.asset.url ?? posterSrc;
  }, [item.asset.url, posterSrc]);

  const imageThumbSrc = useMemo(() => {
    return item.asset.thumbUrl ?? item.asset.thumbnailUrl ?? undefined;
  }, [item.asset.thumbUrl, item.asset.thumbnailUrl]);

  const hoverVideoSrc = useMemo(() => {
    // If the backend provides a tiny preview clip, prefer it for hover playback.
    return item.asset.previewUrl ?? item.asset.url ?? null;
  }, [item.asset.previewUrl, item.asset.url]);
  const canPreviewVideo = Boolean(hoverVideoSrc);

  useEffect(() => {
    if (!isVideo) return;
    if (!isNearViewport) return;
    if (!canHover) return;
    if (isActiveVideo) return;
    if (!hoverVideoSrc) return;
    prefetchVideoMetadata(hoverVideoSrc);
  }, [canHover, hoverVideoSrc, isActiveVideo, isNearViewport, isVideo]);

  useEffect(() => {
    if (!isActiveVideo) return;
    if (isNearViewport) return;
    setActiveVideoId((current) => (current === item.id ? null : current));
  }, [isActiveVideo, isNearViewport, item.id, setActiveVideoId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const tryPlay = async () => {
      try {
        video.currentTime = 0;
        await video.play();
      } catch {
        // Ignore play failures (can happen if the browser blocks playback).
      }
    };

    void tryPlay();
  }, [isActiveVideo]);

  const requestStart = () => {
    setActiveVideoId(item.id);
  };

  const requestStop = () => {
    setActiveVideoId((current) => (current === item.id ? null : current));
  };

  return (
    <article
      className={cn(
        'group relative h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-background-secondary shadow-card transition-transform duration-200',
        'hover:-translate-y-0.5 hover:shadow-card-hover'
      )}
      onMouseEnter={canHover && isVideo && canPreviewVideo ? requestStart : undefined}
      onMouseLeave={canHover && isVideo && canPreviewVideo ? requestStop : undefined}
      onClick={() => {
        // Clicking a feed card opens the detail modal (video can still preview on hover).
        requestStop();
        onOpen(item);
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        requestStop();
        onOpen(item);
      }}
      role="button"
      tabIndex={0}
    >
      {/* Media */}
      <div className="absolute inset-0">
        {isVideo ? (
          isActiveVideo && hoverVideoSrc ? (
            <video
              ref={videoRef}
              src={hoverVideoSrc ?? undefined}
              muted
              playsInline
              loop
              preload="metadata"
              className="h-full w-full object-cover"
            />
          ) : (
            <ProgressiveImage
              src={posterSrc}
              thumbSrc={item.asset.thumbUrl ?? posterSrc}
              blurDataUrl={item.asset.blurDataUrl ?? undefined}
              alt={item.caption ?? item.prompt ?? 'Video'}
              priority={priority}
              loadFull={false}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              aspectRatio={item.asset.width && item.asset.height ? `${item.asset.width}/${item.asset.height}` : '1'}
            />
          )
        ) : (
          <ProgressiveImage
            src={fullSrc}
            thumbSrc={imageThumbSrc}
            blurDataUrl={item.asset.blurDataUrl ?? undefined}
            alt={item.caption ?? item.prompt ?? 'Image'}
            priority={priority}
            loadFull={!imageThumbSrc}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            aspectRatio={item.asset.width && item.asset.height ? `${item.asset.width}/${item.asset.height}` : '1'}
          />
        )}
      </div>

      {/* Hover overlay */}
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0 flex items-end gap-2 p-3',
          'bg-gradient-to-t from-black/80 via-black/10 to-transparent',
          'opacity-0 transition-opacity duration-200 group-hover:opacity-100'
        )}
      >
        <div className="min-w-0 flex-1">
          {(item.caption ?? item.prompt) && (
            <p
              className="text-xs leading-snug text-white/95"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {item.caption ?? item.prompt}
            </p>
          )}
        </div>
      </div>

      {/* Reactions + emoji picker */}
      <div ref={pickerRef} className="absolute bottom-0 left-0 right-0 z-10 flex flex-wrap items-end gap-1 px-2 pb-2">
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

        {pickerOpen && (
          <div
            className="absolute bottom-full left-0 mb-1.5 flex items-center gap-1 rounded-full border border-white/15 bg-black/80 px-2 py-1.5 shadow-lg backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          >
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                disabled={reactionBusy}
                onClick={() => void handleReact(emoji)}
                className="rounded-full p-1 text-base transition-transform hover:scale-125 hover:bg-white/10 disabled:opacity-50"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Video badge */}
      {isVideo && !isActiveVideo && (
        <div className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[11px] font-medium text-white">
          <Play className="h-3.5 w-3.5" />
          <span>{canHover ? 'Preview' : 'Open'}</span>
        </div>
      )}
    </article>
  );
}
