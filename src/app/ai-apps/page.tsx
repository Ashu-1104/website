'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, ThumbsUp } from 'lucide-react';
import Footer from '@/components/Footer';
import AIAppsSeoBlock from '@/components/ai-apps/AIAppsSeoBlock';
import { useAIApps } from '@/hooks/useApi';
import { cn } from '@/lib/utils';
import { isVideoUrl, isGifUrl } from '@/lib/media';
import { formatCompactNumber } from '@/lib/format';

// Storage keys
const FAVORITES_KEY = 'ai-apps-favorites';
const LIKES_KEY = 'ai-apps-likes';

// Get stored set from localStorage
function getStoredSet(key: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(key);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

// Save set to localStorage
function saveSet(key: string, set: Set<string>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify([...set]));
}

export default function AIAppsPage() {
  const { data, loading, error } = useAIApps({ limit: 50 });
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [likes, setLikes] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setFavorites(getStoredSet(FAVORITES_KEY));
    setLikes(getStoredSet(LIKES_KEY));
    setMounted(true);
  }, []);

  const apps = data?.items || [];

  // Toggle favorite
  const toggleFavorite = useCallback((e: React.MouseEvent, slug: string) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      saveSet(FAVORITES_KEY, next);
      return next;
    });
  }, []);

  // Toggle like
  const toggleLike = useCallback((e: React.MouseEvent, slug: string) => {
    e.preventDefault();
    e.stopPropagation();
    setLikes((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      saveSet(LIKES_KEY, next);
      return next;
    });
  }, []);

  if (loading) {
    return (
      <>
        <div className="content-wrapper">
          <h1 className="page-title">AI Apps &amp; Tools — Face Swap, Background Remover, Deepfake &amp; More</h1>
          <p className="mt-2 text-text-secondary">
            Free AI image and video tools: face swap, background remover, image upscaler, deepfake video maker, cloth
            swap, AI eraser, sketch-to-image, manga colorizer, AI avatar generator — no installs, no restrictions.
          </p>
          <div className="mt-6 grid justify-items-center gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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

          <AIAppsSeoBlock />
        </div>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="content-wrapper">
          <h1 className="page-title">AI Apps &amp; Tools — Face Swap, Background Remover, Deepfake &amp; More</h1>
          <p className="mt-2 text-red-400">Failed to load apps. Please try again.</p>

          <AIAppsSeoBlock />
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <div className="content-wrapper">
        <h1 className="page-title">AI Apps</h1>
        <p className="mt-2 text-text-secondary">Choose an app to open its playground.</p>

        <div className="mt-6 grid justify-items-center gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {apps.map((tool) => {
            const isFavorited = mounted && favorites.has(tool.slug);
            const isLiked = mounted && likes.has(tool.slug);
            const favoriteCount = tool.favoriteCount + (isFavorited ? 1 : 0);
            const likeCount = tool.likeCount + (isLiked ? 1 : 0);

            return (
              <Link
                key={tool.slug}
                href={`/ai-apps/${tool.slug}`}
                className="ai-model-card w-full max-w-[360px]"
                aria-label={`Open ${tool.label}`}
              >
                <div className="ai-model-card-media">
                  {isVideoUrl(tool.thumbnailUrl) ? (
                    <video
                      src={tool.thumbnailUrl!}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="ai-model-card-image"
                    />
                  ) : (
                    <Image
                      src={tool.thumbnailUrl || '/images/placeholder.svg'}
                      alt={`${tool.label} — AI app demo`}
                      fill
                      sizes="(max-width: 768px) 70vw, (max-width: 1200px) 35vw, 25vw"
                      className="ai-model-card-image"
                      unoptimized={isGifUrl(tool.thumbnailUrl)}
                    />
                  )}
                  <span className="ai-model-card-badge">AI App</span>
                </div>

                <div className="ai-model-card-footer">
                  <h3 className="ai-model-card-title" title={tool.label}>
                    {tool.label}
                  </h3>
                  <p className="ai-model-card-description">{tool.description}</p>
                  <div className="ai-model-card-stats">
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(e, tool.slug)}
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
                      <span className="ai-model-card-stat-value">{formatCompactNumber(favoriteCount)}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => toggleLike(e, tool.slug)}
                      className={cn('ai-model-card-stat', isLiked && 'ai-model-card-stat-active')}
                      aria-pressed={isLiked}
                      aria-label={isLiked ? 'Remove like' : 'Like'}
                    >
                      <ThumbsUp
                        className={cn('ai-model-card-stat-icon', 'ai-model-card-like-icon')}
                        fill={isLiked ? 'currentColor' : 'none'}
                      />
                      <span className="ai-model-card-stat-value">{formatCompactNumber(likeCount)}</span>
                    </button>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <AIAppsSeoBlock />
      </div>
      <Footer />
    </>
  );
}
