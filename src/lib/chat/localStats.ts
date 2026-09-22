import type { ChatStats } from '@/types/chat';
import { notifyFavoritesUpdated } from '@/lib/favorites';

const STATS_STORAGE_KEY = 'vp.chat.statsByChatId';

function hashStringToNumber(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function buildDefaultStats(chatId: string): ChatStats {
  const seed = hashStringToNumber(chatId);
  return {
    views: 142_000 + (seed % 9_000),
    likes: 4_500 + (seed % 800),
    conversations: 4 + (seed % 25),
    isLiked: false,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isChatStats(value: unknown): value is ChatStats {
  if (!isRecord(value)) return false;
  return (
    typeof value.views === 'number' &&
    typeof value.likes === 'number' &&
    typeof value.conversations === 'number' &&
    typeof value.isLiked === 'boolean'
  );
}

function readStatsFromStorage(): Record<string, ChatStats> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STATS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return {};
    const sanitized: Record<string, ChatStats> = {};
    for (const [chatId, value] of Object.entries(parsed)) {
      if (!isChatStats(value)) continue;
      sanitized[chatId] = value;
    }
    return sanitized;
  } catch {
    return {};
  }
}

function writeStatsToStorage(statsByChatId: Record<string, ChatStats>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(statsByChatId));
  } catch {}
}

export function readLikedChatIds(): Set<string> {
  const statsByChatId = readStatsFromStorage();
  const liked = new Set<string>();
  for (const [chatId, stats] of Object.entries(statsByChatId)) {
    if (stats.isLiked) liked.add(chatId);
  }
  return liked;
}

export function isChatLiked(chatId: string): boolean {
  const statsByChatId = readStatsFromStorage();
  return Boolean(statsByChatId[chatId]?.isLiked);
}

export function toggleChatLike(chatId: string): boolean {
  const id = chatId.trim();
  if (!id) return false;

  const statsByChatId = readStatsFromStorage();
  const current = statsByChatId[id] ?? buildDefaultStats(id);
  const nextIsLiked = !current.isLiked;
  const nextLikes = Math.max(0, current.likes + (nextIsLiked ? 1 : -1));
  statsByChatId[id] = { ...current, isLiked: nextIsLiked, likes: nextLikes };
  writeStatsToStorage(statsByChatId);
  notifyFavoritesUpdated('partners');
  return nextIsLiked;
}

