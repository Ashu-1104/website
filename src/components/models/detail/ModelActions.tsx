'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Share2, ThumbsUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const MODELS_LIKES_STORAGE_KEY = 'vp_models_likes';

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

export default function ModelActions({ modelId, modelName }: { modelId: string; modelName: string }) {
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    setIsLiked(readIdSet(MODELS_LIKES_STORAGE_KEY).has(modelId));
  }, [modelId]);

  const sharePayload = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return {
      title: modelName,
      text: `Check out ${modelName}`,
      url: window.location.href,
    };
  }, [modelName]);

  const onShare = useCallback(async () => {
    if (!sharePayload) return;

    try {
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        await navigator.share(sharePayload);
        return;
      }
    } catch {
      // Fall through to clipboard.
    }

    try {
      await navigator.clipboard.writeText(sharePayload.url);
    } catch {
      // Ignore clipboard failures.
    }
  }, [sharePayload]);

  const onToggleLike = useCallback(() => {
    setIsLiked((prev) => {
      const next = !prev;
      const set = readIdSet(MODELS_LIKES_STORAGE_KEY);
      if (next) set.add(modelId);
      else set.delete(modelId);
      writeIdSet(MODELS_LIKES_STORAGE_KEY, set);
      return next;
    });
  }, [modelId]);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onShare}
        className="model-detail-icon-btn"
        aria-label="Share model"
      >
        <Share2 className="w-5 h-5" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={onToggleLike}
        className={cn('model-detail-icon-btn', isLiked && 'model-detail-icon-btn-liked')}
        aria-label={isLiked ? 'Unlike model' : 'Like model'}
        aria-pressed={isLiked}
      >
        <ThumbsUp
          className={cn('w-5 h-5', isLiked && 'text-white')}
          fill={isLiked ? 'currentColor' : 'none'}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}

