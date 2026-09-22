'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Filter, Heart, Search, ThumbsUp } from 'lucide-react';
import { apiFetch } from '@/hooks/useApi';
import { useNsfwPreference } from '@/hooks/useNsfwPreference';
import { isVideoUrl } from '@/lib/media';
import { cn } from '@/lib/utils';
import ModelsSeoBlock from './ModelsSeoBlock';

/**
 * Renders an image or auto-playing muted video thumbnail.
 * Video URLs (.mp4, .webm, .mov) render as <video>.
 * Everything else renders as Next.js <Image>.
 */
function ModelCardMedia({ src, alt }: { src: string; alt: string }) {
  const isVideo = isVideoUrl(src);

  if (isVideo) {
    return (
      <video
        src={src}
        className="ai-model-card-video"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 768px) 70vw, (max-width: 1200px) 35vw, 25vw"
      className="ai-model-card-image"
    />
  );
}

type ModelTypeFilter =
  | 'all'
  | 'CHECKPOINT'
  | 'LORA'
  | 'EMBEDDING'
  | 'VAE';

type BaseModelFilter =
  | 'all'
  | 'SD_1_5'
  | 'SDXL'
  | 'FLUX'
  | 'PONY'
  | 'ILLUSTRIOUS'
  | 'Z_IMAGE_TURBO';

type ApiModel = {
  id: string;
  slug?: string | null;
  name: string;
  description: string | null;
  modelType: string;
  baseModel: string;
  badge: string | null;
  thumbnailUrl: string | null;
  isNsfw: boolean;
  likeCount: number;
  favoriteCount: number;
  usageCount: number;
  versionCount?: number;
};

type ApiModelsResponse = {
  items: ApiModel[];
  nextCursor: string | null;
};

const MODELS_FAVORITES_STORAGE_KEY = 'vp_models_favorites';
const MODELS_LIKES_STORAGE_KEY = 'vp_models_likes';

const TYPE_OPTIONS: Array<{ value: ModelTypeFilter; label: string }> = [
  { value: 'all', label: 'All types' },
  { value: 'CHECKPOINT', label: 'Checkpoint' },
  { value: 'LORA', label: 'LoRA' },
  { value: 'EMBEDDING', label: 'Embedding' },
  { value: 'VAE', label: 'VAE' },
];

const BASE_MODEL_OPTIONS: Array<{ value: BaseModelFilter; label: string }> = [
  { value: 'all', label: 'All base models' },
  { value: 'SD_1_5', label: 'SD 1.5' },
  { value: 'SDXL', label: 'SDXL' },
  { value: 'ILLUSTRIOUS', label: 'Illustrious' },
  { value: 'PONY', label: 'Pony' },
  { value: 'FLUX', label: 'Flux' },
  { value: 'Z_IMAGE_TURBO', label: 'Z Image Turbo' },
];

function formatCount(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return num.toString();
}

function readIdSet(storageKey: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((value): value is string => typeof value === 'string'));
  } catch {
    return new Set();
  }
}

function writeIdSet(storageKey: string, ids: Set<string>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey, JSON.stringify(Array.from(ids)));
}

export default function AIModelsPage() {
  const [models, setModels] = useState<ApiModel[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ModelTypeFilter>('all');
  const [baseModelFilter, setBaseModelFilter] = useState<BaseModelFilter>('all');
  const { enableNsfw: includeNsfw, setEnableNsfw: setIncludeNsfw } = useNsfwPreference();
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const activeFilterCount =
    (typeFilter !== 'all' ? 1 : 0) +
    (baseModelFilter !== 'all' ? 1 : 0) +
    (!includeNsfw ? 1 : 0);

  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [likes, setLikes] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setFavorites(readIdSet(MODELS_FAVORITES_STORAGE_KEY));
    setLikes(readIdSet(MODELS_LIKES_STORAGE_KEY));
    setMounted(true);
  }, []);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Close filter popover on outside click
  useEffect(() => {
    if (!filterOpen) return;
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [filterOpen]);

  const buildUrl = useCallback(
    (cursor?: string | null) => {
      const params = new URLSearchParams();
      params.set('limit', '50');
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (baseModelFilter !== 'all') params.set('baseModel', baseModelFilter);
      if (includeNsfw) params.set('includeNsfw', 'true');
      if (cursor) params.set('cursor', cursor);
      return `/api/models?${params.toString()}`;
    },
    [baseModelFilter, includeNsfw, typeFilter]
  );

  const loadInitial = useCallback(async () => {
    setLoadingInitial(true);
    setError(null);

    try {
      const page = await apiFetch<ApiModelsResponse>(buildUrl(null));
      setModels(page.items);
      setNextCursor(page.nextCursor ?? null);
    } catch (err) {
      setModels([]);
      setNextCursor(null);
      setError(err instanceof Error ? err.message : 'Failed to load models.');
    } finally {
      setLoadingInitial(false);
    }
  }, [buildUrl]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const loadMore = useCallback(() => {
    if (!nextCursor || loadingMore) return;

    setLoadingMore(true);
    setError(null);

    void apiFetch<ApiModelsResponse>(buildUrl(nextCursor))
      .then((page) => {
        setModels((current) => [...current, ...page.items]);
        setNextCursor(page.nextCursor ?? null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load more models.');
      })
      .finally(() => setLoadingMore(false));
  }, [buildUrl, loadingMore, nextCursor]);

  const filteredModels = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return models;
    return models.filter((model) => {
      const haystack = [
        model.name,
        model.badge ?? '',
        model.description ?? '',
        model.modelType ?? '',
        model.baseModel ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [models, debouncedSearch]);

  const toggleFavorite = useCallback((e: React.MouseEvent, modelId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(modelId)) next.delete(modelId);
      else next.add(modelId);
      writeIdSet(MODELS_FAVORITES_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const toggleLike = useCallback((e: React.MouseEvent, modelId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setLikes((prev) => {
      const next = new Set(prev);
      if (next.has(modelId)) next.delete(modelId);
      else next.add(modelId);
      writeIdSet(MODELS_LIKES_STORAGE_KEY, next);
      return next;
    });
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="page-title">AI Models — Stable Diffusion Checkpoints &amp; LoRAs</h1>
          <p className="mt-2 text-text-secondary">
            Browse custom Stable Diffusion, SDXL, Pony, Flux checkpoints and LoRA models. Free to use, no downloads,
            instant generation — including NSFW and uncensored styles.
          </p>
        </div>

        <div className="flex w-full items-center gap-2 md:w-auto">
          <div className="relative flex-1 md:w-[280px] md:flex-none">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search models…"
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-10 pr-3 text-sm text-white placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-pink/40"
            />
          </div>

          {/* Filter button */}
          <div className="relative shrink-0" ref={filterRef}>
            <button
              type="button"
              aria-label="Open filters"
              aria-haspopup="dialog"
              aria-expanded={filterOpen}
              onClick={() => setFilterOpen((prev) => !prev)}
              className={cn(
                'relative p-2.5 rounded-full border transition-colors',
                filterOpen || activeFilterCount > 0
                  ? 'bg-accent-pink/20 border-accent-pink/30 hover:bg-accent-pink/25'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              )}
            >
              <Filter className={cn('w-5 h-5', filterOpen || activeFilterCount > 0 ? 'text-white' : 'text-text-secondary')} />
            </button>

            {/* Filter popover */}
            {filterOpen && (
              <div
                role="dialog"
                aria-label="Filters"
                className="absolute right-0 mt-3 w-[min(600px,calc(100vw-24px))] rounded-2xl border border-white/10 bg-background-secondary/95 backdrop-blur-md shadow-card p-6 z-30"
              >
                <div className="space-y-7">
                  {/* Model Type */}
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-4">Model Type</h3>
                    <div className="flex flex-wrap gap-3">
                      {TYPE_OPTIONS.filter((o) => o.value !== 'all').map((option) => {
                        const isActive = typeFilter === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              setTypeFilter((prev) =>
                                prev === option.value ? 'all' : option.value
                              )
                            }
                            className={cn(
                              'inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-colors',
                              isActive
                                ? 'bg-accent-pink/15 border-accent-pink/50 text-white'
                                : 'bg-white/5 border-white/10 text-text-secondary hover:bg-white/10 hover:text-white'
                            )}
                          >
                            {isActive && <Check className="w-4 h-4 text-accent-pink" aria-hidden="true" />}
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Base Model */}
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-4">Base Model</h3>
                    <div className="flex flex-wrap gap-3">
                      {BASE_MODEL_OPTIONS.filter((o) => o.value !== 'all').map((option) => {
                        const isActive = baseModelFilter === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              setBaseModelFilter((prev) =>
                                prev === option.value ? 'all' : option.value
                              )
                            }
                            className={cn(
                              'inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-colors',
                              isActive
                                ? 'bg-accent-pink/15 border-accent-pink/50 text-white'
                                : 'bg-white/5 border-white/10 text-text-secondary hover:bg-white/10 hover:text-white'
                            )}
                          >
                            {isActive && <Check className="w-4 h-4 text-accent-pink" aria-hidden="true" />}
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* NSFW Toggle */}
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-4">Content</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-text-secondary">Show NSFW Models</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={includeNsfw}
                        onClick={() => setIncludeNsfw(!includeNsfw)}
                        className={cn(
                          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                          includeNsfw ? 'bg-accent-pink' : 'bg-white/20'
                        )}
                      >
                        <span
                          className={cn(
                            'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform',
                            includeNsfw ? 'translate-x-5' : 'translate-x-0'
                          )}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Reset */}
                  <button
                    type="button"
                    onClick={() => {
                      setTypeFilter('all');
                      setBaseModelFilter('all');
                      setIncludeNsfw(true);
                    }}
                    className="w-full py-3.5 rounded-xl border border-accent-pink/40 text-white text-lg font-semibold hover:bg-accent-pink/10 transition-colors"
                  >
                    Reset Selection
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          Failed to load models. {error}
        </div>
      )}

      {loadingInitial ? (
        <div className="grid justify-items-center gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="ai-model-card w-full max-w-[360px] animate-pulse">
              <div className="ai-model-card-media bg-gray-700"></div>
              <div className="ai-model-card-footer">
                <div className="h-4 bg-gray-600 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-600 rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredModels.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-text-secondary">
          No models found.
        </div>
      ) : (
        <div className="grid justify-items-center gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredModels.map((model) => {
            const isFavorited = mounted && favorites.has(model.id);
            const isLiked = mounted && likes.has(model.id);
            const favoriteCount = model.favoriteCount + (isFavorited ? 1 : 0);
            const likeCount = model.likeCount + (isLiked ? 1 : 0);
            const modelRouteId = model.slug || model.id;

            return (
              <Link
                key={model.id}
                href={`/models/${modelRouteId}`}
                className="ai-model-card w-full max-w-[360px]"
                aria-label={`Open ${model.name}`}
              >
                <div className="ai-model-card-media">
                  <ModelCardMedia
                    src={model.thumbnailUrl || '/images/placeholder.svg'}
                    alt={`${model.name} — AI model thumbnail`}
                  />
                  <span className="ai-model-card-badge">
                    {model.modelType} · {model.baseModel}
                  </span>
                  {model.versionCount && model.versionCount > 1 && (
                    <span className="ai-model-card-version-badge">
                      {model.versionCount} versions
                    </span>
                  )}
                </div>

                <div className="ai-model-card-footer">
                  <h3 className="ai-model-card-title" title={model.name}>
                    {model.name}
                  </h3>
                  <div className="ai-model-card-stats">
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(e, model.id)}
                      className={cn('ai-model-card-stat', isFavorited && 'ai-model-card-stat-active')}
                      aria-pressed={isFavorited}
                      aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Heart
                        className={cn(
                          'ai-model-card-stat-icon',
                          isFavorited && 'ai-model-card-favorite-icon-active'
                        )}
                        fill={isFavorited ? 'currentColor' : 'none'}
                      />
                      <span className="ai-model-card-stat-value">{formatCount(favoriteCount)}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => toggleLike(e, model.id)}
                      className={cn('ai-model-card-stat', isLiked && 'ai-model-card-stat-active')}
                      aria-pressed={isLiked}
                      aria-label={isLiked ? 'Remove like' : 'Like'}
                    >
                      <ThumbsUp
                        className={cn('ai-model-card-stat-icon', 'ai-model-card-like-icon')}
                        fill={isLiked ? 'currentColor' : 'none'}
                      />
                      <span className="ai-model-card-stat-value">{formatCount(likeCount)}</span>
                    </button>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {nextCursor && !loadingInitial && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className={cn(
              'rounded-xl border border-accent-pink/40 px-6 py-3 text-sm font-semibold text-white transition-colors',
              loadingMore ? 'opacity-60 cursor-not-allowed' : 'hover:bg-accent-pink/10'
            )}
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}

      <ModelsSeoBlock />
    </div>
  );
}
