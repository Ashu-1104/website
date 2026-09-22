import { readIdSet, writeIdSet } from '@/lib/idSetStorage';

export type FavoriteKind = 'images' | 'videos' | 'models' | 'ai-audio';
export type FavoritesUpdatedDetail = FavoriteKind | 'partners' | null;

export const FAVORITES_UPDATED_EVENT = 'vp:favorites:updated';

export const FAVORITES_STORAGE_KEYS: Record<FavoriteKind, string> = {
  images: 'vp_images_favorites',
  videos: 'vp_videos_favorites',
  models: 'vp_models_favorites',
  'ai-audio': 'vp_audio_favorites',
};

export function notifyFavoritesUpdated(detail: FavoritesUpdatedDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<FavoritesUpdatedDetail>(FAVORITES_UPDATED_EVENT, { detail }));
}

export function readFavoriteIds(kind: FavoriteKind): Set<string> {
  return readIdSet(FAVORITES_STORAGE_KEYS[kind]);
}

export function writeFavoriteIds(kind: FavoriteKind, ids: Set<string>) {
  writeIdSet(FAVORITES_STORAGE_KEYS[kind], ids);
  notifyFavoritesUpdated(kind);
}

export function toggleFavoriteId(kind: FavoriteKind, id: string): boolean {
  const normalized = id.trim();
  if (!normalized) return false;

  const ids = readFavoriteIds(kind);
  const next = !ids.has(normalized);
  if (next) ids.add(normalized);
  else ids.delete(normalized);
  writeFavoriteIds(kind, ids);
  return next;
}

