'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Headphones, Heart, Image as ImageIcon, Users, Video } from 'lucide-react';
import ProfileModelsTab from '@/components/profile/ProfileModelsTab';
import { chatContacts } from '@/data/chatContacts';
import { FAVORITES_UPDATED_EVENT, readFavoriteIds, toggleFavoriteId, type FavoritesUpdatedDetail } from '@/lib/favorites';
import { readLikedChatIds, toggleChatLike } from '@/lib/chat/localStats';
import { cn } from '@/lib/utils';
import type { GeneratedImage, GeneratedVideo } from '@/types';

type FavoriteCategory = 'images' | 'videos' | 'partners' | 'models' | 'ai-audio';

function EmptyState({
  title,
  subtitle,
  actionHref,
  actionLabel,
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
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="gallery-generate-btn">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export default function ProfileFavoritesTab(props: { images: GeneratedImage[]; videos: GeneratedVideo[] }) {
  const { images, videos } = props;
  const [category, setCategory] = useState<FavoriteCategory>('models');
  const [favoriteImageIds, setFavoriteImageIds] = useState<Set<string>>(() => new Set());
  const [favoriteVideoIds, setFavoriteVideoIds] = useState<Set<string>>(() => new Set());
  const [favoriteModelIds, setFavoriteModelIds] = useState<Set<string>>(() => new Set());
  const [favoriteAudioIds, setFavoriteAudioIds] = useState<Set<string>>(() => new Set());
  const [likedPartnerIds, setLikedPartnerIds] = useState<Set<string>>(() => new Set());

  const refresh = useCallback(() => {
    setFavoriteImageIds(readFavoriteIds('images'));
    setFavoriteVideoIds(readFavoriteIds('videos'));
    setFavoriteModelIds(readFavoriteIds('models'));
    setFavoriteAudioIds(readFavoriteIds('ai-audio'));
    setLikedPartnerIds(readLikedChatIds());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onUpdated = (event: Event) => {
      const detail = (event as CustomEvent<FavoritesUpdatedDetail>).detail;
      if (detail && detail !== 'partners' && detail !== 'images' && detail !== 'videos' && detail !== 'models' && detail !== 'ai-audio') {
        return;
      }
      refresh();
    };
    window.addEventListener(FAVORITES_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(FAVORITES_UPDATED_EVENT, onUpdated);
  }, [refresh]);

  const tabItems = useMemo(
    () => [
      { id: 'images' as const, label: 'Images', Icon: ImageIcon, count: favoriteImageIds.size },
      { id: 'videos' as const, label: 'Videos', Icon: Video, count: favoriteVideoIds.size },
      { id: 'partners' as const, label: 'AI Partners', Icon: Users, count: likedPartnerIds.size },
      { id: 'models' as const, label: 'Models', Icon: Box, count: favoriteModelIds.size },
      { id: 'ai-audio' as const, label: 'AI Audio', Icon: Headphones, count: favoriteAudioIds.size },
    ],
    [favoriteAudioIds.size, favoriteImageIds.size, favoriteModelIds.size, favoriteVideoIds.size, likedPartnerIds.size]
  );

  const favoriteImages = useMemo(() => {
    if (favoriteImageIds.size === 0 || images.length === 0) return [];
    return images.filter((item) => favoriteImageIds.has(item.id));
  }, [favoriteImageIds, images]);

  const favoriteVideos = useMemo(() => {
    if (favoriteVideoIds.size === 0 || videos.length === 0) return [];
    return videos.filter((item) => favoriteVideoIds.has(item.id));
  }, [favoriteVideoIds, videos]);

  const favoritePartners = useMemo(() => {
    if (likedPartnerIds.size === 0) return [];
    return chatContacts.filter((contact) => likedPartnerIds.has(contact.id));
  }, [likedPartnerIds]);

  const toggleImageFavorite = useCallback((id: string) => {
    const nextIsFavorited = toggleFavoriteId('images', id);
    setFavoriteImageIds((prev) => {
      const next = new Set(prev);
      if (nextIsFavorited) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const toggleVideoFavorite = useCallback((id: string) => {
    const nextIsFavorited = toggleFavoriteId('videos', id);
    setFavoriteVideoIds((prev) => {
      const next = new Set(prev);
      if (nextIsFavorited) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const togglePartnerFavorite = useCallback((id: string) => {
    const nextIsLiked = toggleChatLike(id);
    setLikedPartnerIds((prev) => {
      const next = new Set(prev);
      if (nextIsLiked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const content = useMemo(() => {
    switch (category) {
      case 'models':
        return <ProfileModelsTab />;
      case 'partners':
        if (favoritePartners.length === 0) {
          return (
            <EmptyState
              title="No favorite AI partners yet"
              subtitle="Tap the heart on a partner profile to save them here."
              actionHref="/chat"
              actionLabel="Browse AI Partners"
            />
          );
        }
        return (
          <div className="gallery-grid" aria-label="Favorite AI partners">
            {favoritePartners.map((contact) => (
              <Link key={contact.id} href={`/chat/${contact.id}`} className="gallery-item gallery-item-character">
                <Image
                  src={contact.avatarUrl}
                  alt={contact.name}
                  fill
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                  className="gallery-item-image"
                />
                <button
                  type="button"
                  className={cn('gallery-favorite-btn', 'gallery-favorite-btn-active')}
                  onClick={(event) => {
                    event.preventDefault();
                    togglePartnerFavorite(contact.id);
                  }}
                  aria-label="Remove from favorites"
                >
                  <Heart className="h-4 w-4" fill="currentColor" aria-hidden="true" />
                </button>
                <div className="gallery-item-overlay">
                  <p className="gallery-item-name">{contact.name}</p>
                </div>
              </Link>
            ))}
          </div>
        );
      case 'images':
        if (favoriteImageIds.size === 0) {
          return (
            <EmptyState
              title="No favorite images yet"
              subtitle="Tap the heart on any image to save it here."
              actionHref="/create?type=text-to-image"
              actionLabel="Generate Images"
            />
          );
        }
        if (favoriteImages.length === 0) {
          return (
            <EmptyState
              title="Favorite images are saved"
              subtitle="Your gallery will show them here once images are loaded."
            />
          );
        }
        return (
          <div className="gallery-grid" aria-label="Favorite images">
            {favoriteImages.map((item) => (
              <div key={item.id} className="gallery-item">
                <Image
                  src={item.thumbnailUrl || item.url}
                  alt={item.prompt}
                  fill
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                  className="gallery-item-image"
                />
                <button
                  type="button"
                  className={cn('gallery-favorite-btn', 'gallery-favorite-btn-active')}
                  onClick={() => toggleImageFavorite(item.id)}
                  aria-label="Remove from favorites"
                >
                  <Heart className="h-4 w-4" fill="currentColor" aria-hidden="true" />
                </button>
                <div className="gallery-item-overlay">
                  <p className="gallery-item-prompt">{item.prompt}</p>
                </div>
              </div>
            ))}
          </div>
        );
      case 'videos':
        if (favoriteVideoIds.size === 0) {
          return (
            <EmptyState
              title="No favorite videos yet"
              subtitle="Tap the heart on any video to save it here."
              actionHref="/create/video"
              actionLabel="Generate Videos"
            />
          );
        }
        if (favoriteVideos.length === 0) {
          return (
            <EmptyState
              title="Favorite videos are saved"
              subtitle="Your gallery will show them here once videos are loaded."
            />
          );
        }
        return (
          <div className="gallery-grid" aria-label="Favorite videos">
            {favoriteVideos.map((item) => (
              <div key={item.id} className="gallery-item gallery-item-video">
                <Image
                  src={item.thumbnailUrl}
                  alt={item.prompt}
                  fill
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                  className="gallery-item-image"
                />
                <button
                  type="button"
                  className={cn('gallery-favorite-btn', 'gallery-favorite-btn-active')}
                  onClick={() => toggleVideoFavorite(item.id)}
                  aria-label="Remove from favorites"
                >
                  <Heart className="h-4 w-4" fill="currentColor" aria-hidden="true" />
                </button>
                <div className="gallery-item-play" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <div className="gallery-item-duration">
                  {Math.floor(item.duration / 60)}:{(item.duration % 60).toString().padStart(2, '0')}
                </div>
                <div className="gallery-item-overlay">
                  <p className="gallery-item-prompt">{item.prompt}</p>
                </div>
              </div>
            ))}
          </div>
        );
      case 'ai-audio':
      default:
        return (
          <EmptyState
            title="No favorite AI audio yet"
            subtitle="Save audio generations and they will show up here."
          />
        );
    }
  }, [
    category,
    favoriteImageIds.size,
    favoriteImages,
    favoritePartners,
    favoriteVideoIds.size,
    favoriteVideos,
    toggleImageFavorite,
    togglePartnerFavorite,
    toggleVideoFavorite,
  ]);

  return (
    <div className="profile-favorites" aria-label="Favorites">
      <div className="profile-favorites-tabs" role="tablist" aria-label="Favorites category">
        {tabItems.map(({ id, label, Icon, count }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={category === id}
            className={cn('profile-favorites-tab', category === id && 'profile-favorites-tab-active')}
            onClick={() => setCategory(id)}
          >
            <Icon className="profile-favorites-tab-icon" aria-hidden="true" />
            {label}
            <span className="profile-favorites-tab-count">{count}</span>
          </button>
        ))}
      </div>

      <div className="mt-4">{content}</div>
    </div>
  );
}

