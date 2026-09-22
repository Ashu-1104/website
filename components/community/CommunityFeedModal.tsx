'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { Copy, MessageCircle, Send, X } from 'lucide-react';

import { useRouter } from 'next/navigation';

import { cn } from '@/lib/utils';
import ProgressiveImage from '@/components/community/ProgressiveImage';
import type { CommunityFeedItem } from '@/components/community/MediaCard';
import { useLocalUser } from '@/components/community/useLocalUser';

type ApiReaction = { emoji: string; count: number };
type ApiComment = {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; handle: string | null };
};

type ApiItemDetail = {
  id: string;
  caption: string | null;
  createdAt: string;
  creator: { id: string; handle: string | null; avatarUrl?: string | null };
  asset: CommunityFeedItem['asset'] & { url: string | null; posterUrl?: string | null; previewUrl?: string | null };
  generation: {
    prompt: string | null;
    negativePrompt: string | null;
    seed: string | null;
    sampler: string | null;
    checkpoint: null | { name: string; version: string | null; thumbnailUrl: string | null; modelSlug: string | null; modelId: string | null };
    loras: Array<{ id: string; name: string; version: string | null; weight: number | null; thumbnailUrl: string | null; modelSlug: string | null; modelId: string | null }>;
  };
  reactions: ApiReaction[];
  myReactions: string[];
  commentsCount: number;
};

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '⚡'] as const;

function formatRelativeTime(dateIso: string) {
  const created = new Date(dateIso);
  const seconds = Math.floor((Date.now() - created.getTime()) / 1000);
  if (!Number.isFinite(seconds)) return '';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

function getInitial(handle: string | null) {
  const trimmed = (handle ?? '').trim();
  return trimmed.length > 0 ? trimmed[0]!.toUpperCase() : 'U';
}

function makeMockDetail(initialItem: CommunityFeedItem): ApiItemDetail {
  const createdAt = initialItem.createdAt ?? new Date().toISOString();
  const idNumber = Number.parseInt(initialItem.id.replace(/\D/g, ''), 10);
  const seedBase = Number.isFinite(idNumber) ? idNumber : 0;
  const includeNegative = seedBase % 3 === 0;

  return {
    id: initialItem.id,
    caption: initialItem.caption ?? null,
    createdAt,
    creator: {
      id: 'mock-creator',
      handle: initialItem.creator?.handle ?? 'zuzul',
    },
    asset: {
      ...initialItem.asset,
      url: initialItem.asset.url,
      posterUrl: initialItem.asset.posterUrl ?? null,
      previewUrl: initialItem.asset.previewUrl ?? null,
    },
    generation: {
      prompt: initialItem.prompt ?? 'cinematic lighting, ultra realistic, high quality',
      negativePrompt: includeNegative ? 'bad anatomy, extra fingers, watermark' : null,
      seed: String(32364874 + seedBase),
      sampler: 'Euler a',
      checkpoint: {
        name: 'Amanatsu (Illustrious)',
        version: 'v1.1',
        thumbnailUrl: '/images/placeholder.svg',
        modelSlug: null,
        modelId: null,
      },
      loras: [
        {
          id: 'mock-lora-1',
          name: 'Stabilizer IL/NAI',
          version: 'illus01 v1.185c',
          weight: 0.4,
          thumbnailUrl: '/images/placeholder.svg',
          modelSlug: null,
          modelId: null,
        },
        ...(seedBase % 4 === 0
          ? [
              {
                id: 'mock-lora-2',
                name: 'Skin Detail Enhancer',
                version: 'v2.0',
                weight: 0.35,
                thumbnailUrl: '/images/placeholder.svg',
                modelSlug: null,
                modelId: null,
              },
            ]
          : []),
      ],
    },
    reactions: REACTION_EMOJIS.map((emoji, index) => ({
      emoji,
      count: 50 + seedBase * 3 + index * 7,
    })),
    myReactions: [],
    commentsCount: 4,
  };
}

function ReactionChip(props: {
  emoji: string;
  count: number;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const { emoji, count, active, disabled, onClick } = props;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors',
        active
          ? 'border border-accent-pink/50 bg-accent-pink/15 text-white'
          : 'border border-white/10 bg-white/5 text-white/90 hover:border-accent-pink/30 hover:bg-white/10',
        disabled && 'opacity-60'
      )}
    >
      <span className="text-base leading-none">{emoji}</span>
      <span className="text-xs font-medium text-white/80">{count}</span>
    </button>
  );
}

const PROMPT_COLLAPSED_LINES = 4;

function CollapsibleText({ text, className }: { text: string; className?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [needsTruncation, setNeedsTruncation] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    // Check if content exceeds the collapsed line-clamp height
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 20;
    setNeedsTruncation(el.scrollHeight > lineHeight * (PROMPT_COLLAPSED_LINES + 0.5));
  }, [text]);

  return (
    <div>
      <div
        ref={textRef}
        className={cn(className, !expanded && needsTruncation && 'prompt-collapsed')}
        style={!expanded && needsTruncation ? { WebkitLineClamp: PROMPT_COLLAPSED_LINES } : undefined}
      >
        {text}
      </div>
      {needsTruncation && (
        <button
          type="button"
          className="mt-1.5 text-xs font-semibold text-accent-pink hover:text-white transition-colors"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}

function CopyButton(props: { value: string; onCopied?: (message: string) => void }) {
  const { value, onCopied } = props;
  return (
    <button
      type="button"
      className="rounded-lg border border-white/10 bg-background-tertiary/40 p-2 text-text-secondary transition-[border-color,background-color,color] hover:border-accent-pink/40 hover:bg-accent-pink/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink/40"
      aria-label="Copy"
      onClick={() => {
        const copy = async () => {
          try {
            await navigator.clipboard.writeText(value);
            onCopied?.('Copied');
          } catch {
            onCopied?.('Copy failed');
          }
        };
        void copy();
      }}
    >
      <Copy className="h-4 w-4" />
    </button>
  );
}

export default function CommunityFeedModal(props: {
  open: boolean;
  itemId: string | null;
  initialItem?: CommunityFeedItem | null;
  onClose: () => void;
  onReactionsChange?: (itemId: string, reactions: Array<{ emoji: string; count: number }>) => void;
}) {
  const { open, itemId, initialItem, onClose, onReactionsChange } = props;
  const router = useRouter();
  const { headers, handle } = useLocalUser();

  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<'generation' | 'discussion'>('generation');

  const [detail, setDetail] = useState<ApiItemDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [reactionsBusy, setReactionsBusy] = useState(false);

  const [comments, setComments] = useState<ApiComment[]>([]);
  const [commentsCursor, setCommentsCursor] = useState<string | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentPosting, setCommentPosting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const isMockItem = Boolean(itemId && itemId.startsWith('mock-'));

  useEffect(() => setMounted(true), []);

  // When a new item opens, reset UI state (prevents leaking the previous item's tab/comments).
  useEffect(() => {
    if (!open) return;
    setTab('generation');
    setComments([]);
    setCommentsCursor(null);
    setCommentText('');
    setCommentError(null);
    setToastMessage(null);
    setDetail(null);
    setDetailError(null);
  }, [itemId, open]);

  // Tiny, transient UX toast (e.g. "Copied") inside the modal.
  useEffect(() => {
    if (!toastMessage) return;
    const id = window.setTimeout(() => setToastMessage(null), 1400);
    return () => window.clearTimeout(id);
  }, [toastMessage]);

  // Modal UX: lock background scroll + close on Escape.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, open]);

  // Fetch the item detail once the modal opens.
  useEffect(() => {
    if (!open || !itemId) return;
    let cancelled = false;

    const load = async () => {
      setDetailError(null);
      setDetailLoading(true);
      setDetail(null);
      try {
        if (isMockItem && initialItem) {
          const mockDetail = makeMockDetail(initialItem);
          if (!cancelled) setDetail(mockDetail);
          return;
        }
        const res = await fetch(`/api/community/items/${itemId}`, { headers });
        const data = (await res.json()) as { item?: ApiItemDetail; error?: string };
        if (!res.ok || !data.item) {
          throw new Error(data.error ?? 'Failed to load item');
        }
        if (cancelled) return;
        setDetail(data.item);
      } catch (err) {
        if (cancelled) return;
        setDetailError(err instanceof Error ? err.message : 'Failed to load item');
        setDetail(null);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [headers, initialItem, isMockItem, itemId, open]);

  const loadComments = async (mode: 'replace' | 'append') => {
    if (!itemId) return;
    if (isMockItem) return;
    setCommentError(null);
    setCommentsLoading(true);
    try {
      const cursorParam = mode === 'append' && commentsCursor ? `&cursor=${encodeURIComponent(commentsCursor)}` : '';
      const res = await fetch(`/api/community/items/${itemId}/comments?limit=30${cursorParam}`);
      const data = (await res.json()) as { comments?: ApiComment[]; nextCursor?: string | null; error?: string };
      if (!res.ok || !Array.isArray(data.comments)) {
        throw new Error(data.error ?? 'Failed to load comments');
      }
      setComments((current) => (mode === 'append' ? [...current, ...data.comments!] : data.comments!));
      setCommentsCursor(data.nextCursor ?? null);
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : 'Failed to load comments');
    } finally {
      setCommentsLoading(false);
    }
  };

  // Lazy-load comments only when the Discussion tab is opened (keeps the feed snappy).
  useEffect(() => {
    if (!open || !itemId) return;
    if (tab !== 'discussion') return;
    if (isMockItem) {
      setComments([
        {
          id: 'mock-comment-1',
          body: 'Please tutorial on how you made the animation',
          createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          user: { id: 'mock-u1', handle: 'deybhitabadde' },
        },
        {
          id: 'mock-comment-2',
          body: 'Is this an original or from a video? Looks complex',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          user: { id: 'mock-u2', handle: 'martita821' },
        },
        {
          id: 'mock-comment-3',
          body: 'Superb!',
          createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          user: { id: 'mock-u3', handle: 'ssenpairat' },
        },
        {
          id: 'mock-comment-4',
          body: "her face is so FUBAR, it's not even funny, lol.",
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          user: { id: 'mock-u4', handle: 'FiragaBlizzaga' },
        },
      ]);
      setCommentsCursor(null);
      return;
    }
    void loadComments('replace');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMockItem, itemId, open, tab]);

  const detailForItem = detail?.id === itemId ? detail : null;
  const reactionSource = detailForItem ?? initialItem;

  const reactionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of reactionSource?.reactions ?? []) counts.set(r.emoji, r.count);
    for (const emoji of REACTION_EMOJIS) {
      if (!counts.has(emoji)) counts.set(emoji, 0);
    }
    return counts;
  }, [reactionSource?.reactions]);

  const myReactions = useMemo(() => new Set(detailForItem?.myReactions ?? []), [detailForItem?.myReactions]);

  const media = detailForItem?.asset ?? initialItem?.asset ?? null;
  const creatorHandle = detailForItem?.creator.handle ?? initialItem?.creator?.handle ?? null;
  const createdAt = detailForItem?.createdAt ?? initialItem?.createdAt ?? null;

  const onToggleReaction = async (emoji: string) => {
    if (!itemId) return;

    // Optimistic update to keep the UI instant.
    const had = myReactions.has(emoji);
    let optimisticReactions: ApiReaction[] = [];
    setDetail((current) => {
      if (!current) return current;
      const nextMy = new Set(current.myReactions);
      if (had) nextMy.delete(emoji);
      else nextMy.add(emoji);

      const nextCounts = new Map<string, number>();
      for (const r of current.reactions) nextCounts.set(r.emoji, r.count);
      nextCounts.set(emoji, Math.max(0, (nextCounts.get(emoji) ?? 0) + (had ? -1 : 1)));

      optimisticReactions = Array.from(nextCounts.entries()).map(([key, count]) => ({ emoji: key, count }));
      return {
        ...current,
        myReactions: Array.from(nextMy),
        reactions: optimisticReactions,
      };
    });

    // Notify parent of optimistic update
    onReactionsChange?.(itemId, optimisticReactions);

    if (isMockItem) return;

    try {
      setReactionsBusy(true);
      const res = await fetch(`/api/community/items/${itemId}/reactions`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      });
      const data = (await res.json()) as { reactions?: ApiReaction[]; error?: string };
      if (!res.ok || !Array.isArray(data.reactions)) {
        throw new Error(data.error ?? 'Failed to react');
      }
      setDetail((current) => (current ? { ...current, reactions: data.reactions! } : current));
      // Notify parent of server-confirmed reactions
      onReactionsChange?.(itemId, data.reactions!);
    } catch {
      // If the request fails (e.g. DB not connected), keep the optimistic UI and let the user continue.
    } finally {
      setReactionsBusy(false);
    }
  };

  const onSubmitComment = async () => {
    if (!itemId) return;
    const text = commentText.trim();
    if (text.length < 1) return;

    if (isMockItem) {
      setComments((current) => [
        {
          id: `mock-local-${Date.now()}`,
          body: text,
          createdAt: new Date().toISOString(),
          user: { id: 'mock-local', handle },
        },
        ...current,
      ]);
      setCommentText('');
      return;
    }

    setCommentPosting(true);
    setCommentError(null);
    try {
      const res = await fetch(`/api/community/items/${itemId}/comments`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
      });
      const data = (await res.json()) as { comment?: ApiComment; error?: string };
      if (!res.ok || !data.comment) {
        throw new Error(data.error ?? 'Failed to post');
      }
      setComments((current) => [data.comment!, ...current]);
      setCommentText('');
      setDetail((current) => (current ? { ...current, commentsCount: current.commentsCount + 1 } : current));
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : 'Failed to post');
    } finally {
      setCommentPosting(false);
    }
  };

  const content = open && itemId ? (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center px-2 py-2 sm:px-4 sm:py-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {/* Backdrop blur + dim */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

      {toastMessage && (
        <div className="pointer-events-none absolute left-1/2 top-6 z-[1002] -translate-x-1/2">
          <div className="rounded-full border border-white/10 bg-background-secondary/90 px-4 py-2 text-sm font-medium text-white shadow-card backdrop-blur-md">
            {toastMessage}
          </div>
        </div>
      )}

      <div className="relative z-[1001] w-full max-w-6xl overflow-hidden rounded-xl sm:rounded-2xl border border-white/10 bg-background-secondary/95 shadow-glow-lg backdrop-blur-md">
        {/* Subtle accent wash so the modal matches the rest of the site's vibrant theme */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent-pink/10 via-transparent to-accent-purple/10" />

        <div className="relative flex max-h-[95vh] sm:max-h-[86vh] flex-col md:flex-row">
          {/* Left: media + reactions */}
          <div className="w-full md:w-[62%]">
            <div className="relative aspect-[3/4] sm:aspect-[4/3] w-full bg-black/30 md:aspect-auto md:h-[calc(86vh-56px)] md:max-h-[calc(86vh-56px)]">
              {media?.type === 'VIDEO' ? (
                <video
                  src={media.url ?? undefined}
                  className="h-full w-full object-contain"
                  autoPlay
                  loop
                  muted
                  playsInline
                  controls={false}
                />
              ) : (
                <div className="h-full w-full">
                  <ProgressiveImage
                    src={media?.url ?? '/images/placeholder.svg'}
                    thumbSrc={media?.thumbUrl ?? media?.thumbnailUrl ?? media?.posterUrl ?? undefined}
                    blurDataUrl={media?.blurDataUrl ?? undefined}
                    alt={detailForItem?.caption ?? detailForItem?.generation.prompt ?? 'Community item'}
                    priority
                    loadFull
                    className="h-full bg-black/20"
                    imgClassName="object-contain"
                    aspectRatio={media?.width && media?.height ? `${media.width}/${media.height}` : undefined}
                  />
                </div>
              )}

              {/* Close button */}
              <button
                type="button"
                onClick={onClose}
                className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-white/90 backdrop-blur transition-colors hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink/40"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 sm:gap-2 border-t border-white/10 bg-background-primary/30 px-3 py-2 sm:px-4 sm:py-3 backdrop-blur">
              {REACTION_EMOJIS.map((emoji) => (
                <ReactionChip
                  key={emoji}
                  emoji={emoji}
                  count={reactionCounts.get(emoji) ?? 0}
                  active={myReactions.has(emoji)}
                  disabled={reactionsBusy}
                  onClick={() => void onToggleReaction(emoji)}
                />
              ))}
            </div>
          </div>

          {/* Right: details/comments */}
          <div className="flex w-full flex-col border-t border-white/10 md:w-[38%] md:border-l md:border-t-0 max-h-[50vh] md:max-h-none overflow-y-auto md:overflow-visible">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-background-tertiary/20 px-4 py-4">
              <Link
                href={`/user/${detailForItem?.creator.handle ?? detailForItem?.creator.id ?? creatorHandle ?? ''}`}
                className="flex min-w-0 items-center gap-3 group"
              >
                <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-white overflow-hidden">
                  {detailForItem?.creator.avatarUrl ? (
                    <Image
                      src={detailForItem.creator.avatarUrl}
                      alt=""
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  ) : (
                    getInitial(creatorHandle)
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white group-hover:text-accent-pink transition-colors">
                    {creatorHandle ?? 'Unknown'}
                  </div>
                  {createdAt && (
                    <div className="text-xs text-text-secondary">{formatRelativeTime(createdAt)}</div>
                  )}
                </div>
              </Link>

              <button
                type="button"
                className="rounded-xl bg-gradient-primary px-4 py-2 text-sm font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink/40"
                onClick={() => {
                  if (!detailForItem) return;
                  const remixData = {
                    prompt: detailForItem.generation.prompt ?? '',
                    negativePrompt: detailForItem.generation.negativePrompt ?? '',
                    seed: detailForItem.generation.seed ?? '',
                    sampler: detailForItem.generation.sampler ?? '',
                    checkpoint: detailForItem.generation.checkpoint
                      ? {
                          name: detailForItem.generation.checkpoint.name,
                          modelSlug: detailForItem.generation.checkpoint.modelSlug,
                          modelId: detailForItem.generation.checkpoint.modelId,
                        }
                      : null,
                    loras: detailForItem.generation.loras.map((l) => ({
                      name: l.name,
                      weight: l.weight,
                      modelSlug: l.modelSlug,
                      modelId: l.modelId,
                      thumbnailUrl: l.thumbnailUrl,
                    })),
                  };
                  try {
                    sessionStorage.setItem('vp_remix_data', JSON.stringify(remixData));
                  } catch { /* ignore quota errors */ }
                  onClose();
                  router.push('/create?type=text-to-image&remix=1');
                }}
              >
                Remix
              </button>
            </div>

            <div className="flex items-center gap-2 px-4 pt-4">
              <button
                type="button"
                className={cn(
                  'rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold transition-[transform,background-color,box-shadow,color]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink/40',
                  tab === 'generation'
                    ? 'bg-gradient-primary text-white shadow-glow'
                    : 'bg-white/5 text-text-secondary hover:bg-white/10 hover:text-white'
                )}
                onClick={() => setTab('generation')}
              >
                Generation data
              </button>
              <button
                type="button"
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold transition-[transform,background-color,box-shadow,color]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink/40',
                  tab === 'discussion'
                    ? 'bg-gradient-primary text-white shadow-glow'
                    : 'bg-white/5 text-text-secondary hover:bg-white/10 hover:text-white'
                )}
                onClick={() => setTab('discussion')}
              >
                <MessageCircle className="h-4 w-4" />
                Discussion
                {detailForItem?.commentsCount ? (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/90">
                    {detailForItem.commentsCount}
                  </span>
                ) : null}
              </button>
            </div>

            <div className="styled-scrollbar flex-1 overflow-y-auto px-4 pb-4 pt-4">
              {detailLoading && (
                <div className="glass rounded-xl border border-white/10 bg-background-tertiary/30 p-4 text-sm text-text-secondary">
                  Loading…
                </div>
              )}
              {detailError && (
                <div className="rounded-xl border border-accent-pink/30 bg-accent-pink/10 p-4 text-sm text-white">
                  {detailError}
                </div>
              )}

              {tab === 'generation' && detailForItem && (
                <div className="space-y-4">
                  {/* Checkpoint model card */}
                  {detailForItem.generation.checkpoint && (
                    <div>
                      <div className="mb-2 text-xs font-semibold text-text-secondary">Checkpoint Model</div>
                      {(() => {
                        const cp = detailForItem.generation.checkpoint;
                        const href = cp.modelSlug ? `/models/${cp.modelSlug}` : cp.modelId ? `/models/${cp.modelId}` : null;
                        return (
                          <div
                            className={cn('glass flex items-center gap-3 rounded-xl border border-white/10 bg-background-tertiary/30 p-3', href && 'cursor-pointer hover:border-white/25 transition-colors')}
                            onClick={(e) => {
                              if (href) {
                                e.stopPropagation();
                                e.preventDefault();
                                window.location.href = href;
                              }
                            }}
                            role={href ? 'link' : undefined}
                          >
                            <div className="h-10 w-10 overflow-hidden rounded-lg border border-white/10 bg-background-secondary">
                              <Image
                                src={cp.thumbnailUrl ?? '/images/placeholder.svg'}
                                alt=""
                                width={40}
                                height={40}
                                sizes="40px"
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-white">
                                {cp.name}
                              </div>
                              {cp.version && (
                                <div className="truncate text-xs text-text-secondary">
                                  {cp.version}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* LoRA cards (multiple) */}
                  {detailForItem.generation.loras.length > 0 && (
                    <div>
                      <div className="mb-2 text-xs font-semibold text-text-secondary">LoRA Models</div>
                      <div className="space-y-2">
                        {detailForItem.generation.loras.map((lora) => {
                          const loraHref = lora.modelSlug ? `/models/${lora.modelSlug}` : lora.modelId ? `/models/${lora.modelId}` : null;
                          return (
                            <div
                              key={lora.id}
                              className={cn('glass flex items-center gap-3 rounded-xl border border-white/10 bg-background-tertiary/30 p-3', loraHref && 'cursor-pointer hover:border-white/25 transition-colors')}
                              onClick={(e) => {
                                if (loraHref) {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  window.location.href = loraHref;
                                }
                              }}
                              role={loraHref ? 'link' : undefined}
                            >
                              <div className="h-10 w-10 overflow-hidden rounded-lg border border-white/10 bg-background-secondary">
                                <Image
                                  src={lora.thumbnailUrl ?? '/images/placeholder.svg'}
                                  alt=""
                                  width={40}
                                  height={40}
                                  sizes="40px"
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-semibold text-white">{lora.name}</div>
                                {lora.version && (
                                  <div className="truncate text-xs text-text-secondary">{lora.version}</div>
                                )}
                              </div>
                              {typeof lora.weight === 'number' && (
                                <div className="rounded-lg border border-white/10 bg-background-primary/40 px-2 py-1 text-xs font-semibold text-white/90">
                                  {lora.weight.toFixed(2)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Prompt */}
                  {detailForItem.generation.prompt && (
                    <div className="glass rounded-xl border border-white/10 bg-background-tertiary/30 p-3">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="text-xs font-semibold text-text-secondary">Prompt</div>
                        <CopyButton value={detailForItem.generation.prompt} onCopied={setToastMessage} />
                      </div>
                      <CollapsibleText text={detailForItem.generation.prompt} className="whitespace-pre-wrap text-sm text-white/90" />
                    </div>
                  )}

                  {/* Negative Prompt (optional) */}
                  {detailForItem.generation.negativePrompt && (
                    <div className="glass rounded-xl border border-white/10 bg-background-tertiary/30 p-3">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="text-xs font-semibold text-text-secondary">Negative Prompt</div>
                        <CopyButton value={detailForItem.generation.negativePrompt} onCopied={setToastMessage} />
                      </div>
                      <CollapsibleText text={detailForItem.generation.negativePrompt} className="whitespace-pre-wrap text-sm text-white/80" />
                    </div>
                  )}

                  {/* Seed + Sampler (only these two, per your spec) */}
                  <div className="grid grid-cols-2 gap-2">
                    {detailForItem.generation.seed && (
                      <div className="glass rounded-xl border border-white/10 bg-background-tertiary/30 p-3">
                        <div className="mb-1 text-xs font-semibold text-text-secondary">Seed</div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate text-sm font-semibold text-white">{detailForItem.generation.seed}</div>
                          <CopyButton value={detailForItem.generation.seed} onCopied={setToastMessage} />
                        </div>
                      </div>
                    )}
                    {detailForItem.generation.sampler && (
                      <div className="glass rounded-xl border border-white/10 bg-background-tertiary/30 p-3">
                        <div className="mb-1 text-xs font-semibold text-text-secondary">Sampler</div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate text-sm font-semibold text-white">{detailForItem.generation.sampler}</div>
                          <CopyButton value={detailForItem.generation.sampler} onCopied={setToastMessage} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {tab === 'discussion' && (
                <div className="space-y-3">
                  <div className="glass rounded-2xl border border-white/10 bg-background-tertiary/30 p-3">
                    <div className="mb-2 text-sm font-semibold text-white">Discussion</div>
                    <div className="flex items-center gap-2">
                      <input
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Type your comment…"
                        className="h-10 w-full rounded-xl border border-white/10 bg-background-primary/40 px-3 text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-pink/40"
                      />
                      <button
                        type="button"
                        disabled={commentPosting || commentText.trim().length < 1}
                        onClick={() => void onSubmitComment()}
                        className={cn(
                          'inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary text-white shadow-glow transition-[transform,opacity,box-shadow]',
                          commentPosting || commentText.trim().length < 1
                            ? 'cursor-not-allowed opacity-50'
                            : 'hover:-translate-y-0.5 hover:shadow-glow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink/40'
                        )}
                        aria-label="Send"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                    {commentError && (
                      <div className="mt-2 text-xs text-accent-pink">{commentError}</div>
                    )}
                  </div>

                  {commentsLoading && comments.length === 0 && (
                    <div className="text-sm text-text-secondary">Loading comments…</div>
                  )}

                  <div className="space-y-3">
                    {comments.map((comment) => (
                      <div key={comment.id} className="glass rounded-2xl border border-white/10 bg-background-tertiary/30 p-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/20 text-sm font-semibold text-white">
                            {getInitial(comment.user.handle)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <div className="truncate text-sm font-semibold text-white">
                                {comment.user.handle ?? 'User'}
                              </div>
                              <div className="flex-shrink-0 text-xs text-text-secondary">
                                {formatRelativeTime(comment.createdAt)}
                              </div>
                            </div>
                            <div className="mt-1 whitespace-pre-wrap text-sm text-white/85">
                              {comment.body}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {commentsCursor && (
                    <button
                      type="button"
                      onClick={() => void loadComments('append')}
                      disabled={commentsLoading}
                      className={cn(
                        'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90 hover:border-accent-pink/30 hover:bg-white/10',
                        commentsLoading && 'opacity-60'
                      )}
                    >
                      {commentsLoading ? 'Loading…' : 'Load more'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  if (!mounted) return null;
  return createPortal(content, document.body);
}
