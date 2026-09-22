'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import type { AICharacter, GeneratedImage, GeneratedVideo } from '@/types';
import { FAVORITES_UPDATED_EVENT, readFavoriteIds, toggleFavoriteId, type FavoritesUpdatedDetail } from '@/lib/favorites';
import { cn } from '@/lib/utils';

function EmptyState({
  title,
  subtitle,
  actionHref = '/create',
  actionLabel = 'Generate',
}: {
  title: string;
  subtitle: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="gallery-empty-state">
      <h3 className="gallery-empty-title">{title}</h3>
      <p className="gallery-empty-subtitle">{subtitle}</p>
      <Link href={actionHref} className="gallery-generate-btn">
        {actionLabel}
      </Link>
    </div>
  );
}

export function ImageGrid({ images }: { images: GeneratedImage[] }) {
  const [favoriteImageIds, setFavoriteImageIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setFavoriteImageIds(readFavoriteIds('images'));
  }, []);

  useEffect(() => {
    const onUpdated = (event: Event) => {
      const detail = (event as CustomEvent<FavoritesUpdatedDetail>).detail;
      if (detail !== 'images') return;
      setFavoriteImageIds(readFavoriteIds('images'));
    };
    window.addEventListener(FAVORITES_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(FAVORITES_UPDATED_EVENT, onUpdated);
  }, []);

  const toggleFavorite = useCallback((imageId: string) => {
    const nextIsFavorited = toggleFavoriteId('images', imageId);
    setFavoriteImageIds((prev) => {
      const next = new Set(prev);
      if (nextIsFavorited) next.add(imageId);
      else next.delete(imageId);
      return next;
    });
  }, []);

  if (images.length === 0) {
    return (
      <EmptyState
        title="You have no generated images yet :("
        subtitle="Generate an image and return back!"
        actionHref="/create?type=text-to-image"
      />
    );
  }

  return (
    <div className="gallery-grid">
      {images.map((image) => (
        <div key={image.id} className="gallery-item">
          <Image
            src={image.thumbnailUrl || image.url}
            alt={image.prompt}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
            className="gallery-item-image"
          />
          <button
            type="button"
            className={cn('gallery-favorite-btn', favoriteImageIds.has(image.id) && 'gallery-favorite-btn-active')}
            onClick={() => toggleFavorite(image.id)}
            aria-label={favoriteImageIds.has(image.id) ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart className="h-4 w-4" fill={favoriteImageIds.has(image.id) ? 'currentColor' : 'none'} aria-hidden="true" />
          </button>
          <div className="gallery-item-overlay">
            <p className="gallery-item-prompt">{image.prompt}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function VideoGrid({ videos }: { videos: GeneratedVideo[] }) {
  const [favoriteVideoIds, setFavoriteVideoIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setFavoriteVideoIds(readFavoriteIds('videos'));
  }, []);

  useEffect(() => {
    const onUpdated = (event: Event) => {
      const detail = (event as CustomEvent<FavoritesUpdatedDetail>).detail;
      if (detail !== 'videos') return;
      setFavoriteVideoIds(readFavoriteIds('videos'));
    };
    window.addEventListener(FAVORITES_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(FAVORITES_UPDATED_EVENT, onUpdated);
  }, []);

  const toggleFavorite = useCallback((videoId: string) => {
    const nextIsFavorited = toggleFavoriteId('videos', videoId);
    setFavoriteVideoIds((prev) => {
      const next = new Set(prev);
      if (nextIsFavorited) next.add(videoId);
      else next.delete(videoId);
      return next;
    });
  }, []);

  if (videos.length === 0) {
    return (
      <EmptyState
        title="You have no generated videos yet :("
        subtitle="Generate a video and return back!"
        actionHref="/create/video"
      />
    );
  }

  return (
    <div className="gallery-grid">
      {videos.map((video) => (
        <div key={video.id} className="gallery-item gallery-item-video">
          <Image
            src={video.thumbnailUrl}
            alt={video.prompt}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
            className="gallery-item-image"
          />
          <button
            type="button"
            className={cn('gallery-favorite-btn', favoriteVideoIds.has(video.id) && 'gallery-favorite-btn-active')}
            onClick={() => toggleFavorite(video.id)}
            aria-label={favoriteVideoIds.has(video.id) ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart className="h-4 w-4" fill={favoriteVideoIds.has(video.id) ? 'currentColor' : 'none'} aria-hidden="true" />
          </button>
          <div className="gallery-item-play">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <div className="gallery-item-duration">
            {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
          </div>
          <div className="gallery-item-overlay">
            <p className="gallery-item-prompt">{video.prompt}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AIPartnerGrid({ partners }: { partners: AICharacter[] }) {
  if (partners.length === 0) {
    return (
      <EmptyState
        title="You have no AI partner yet :("
        subtitle="Generate an AI partner and return back!"
        actionHref="/create-your-ai-partner-quickmode"
        actionLabel="Create AI Partner"
      />
    );
  }

  return (
    <div className="gallery-grid">
      {partners.map((partner) => (
        <Link key={partner.id} href={`/chat/${partner.id}`} className="gallery-item gallery-item-character">
          <Image
            src={partner.thumbnailUrl || partner.image}
            alt={partner.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
            className="gallery-item-image"
            unoptimized={(partner.thumbnailUrl || partner.image).startsWith('data:')}
          />
          <div className="gallery-item-overlay">
            <p className="gallery-item-name">{partner.name}</p>
            {partner.description && (
              <p className="gallery-item-description">{partner.description}</p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
