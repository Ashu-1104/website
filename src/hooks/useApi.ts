'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const AUTH_USER_ID_KEY = 'vp:user:id';
const LEGACY_USER_ID_KEY = 'vp-user-id';

interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseMutationResult<T, V> {
  mutate: (variables: V) => Promise<T | null>;
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Get the user ID for API calls.
 * Returns the authenticated user's ID from localStorage (set at login),
 * or empty string if not logged in.
 */
export function getUserId(): string {
  if (typeof window !== 'undefined') {
    const stored =
      localStorage.getItem(AUTH_USER_ID_KEY) ||
      localStorage.getItem(LEGACY_USER_ID_KEY);
    const trimmed = stored?.trim();
    if (trimmed) return trimmed;
  }
  return '';
}

/**
 * Base fetch function with error handling
 */
export async function apiFetch<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;
  const userId = getUserId();

  const fetchHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
  };
  if (userId) {
    fetchHeaders['x-vp-user-id'] = userId;
  }

  const response = await fetch(url, {
    method,
    headers: fetchHeaders,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `API error: ${response.status}`);
  }

  return data;
}

/**
 * Hook for fetching data from API
 */
export function useApi<T>(
  url: string | null,
  options: FetchOptions = {}
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep options in a ref to avoid re-fetching when callers pass inline objects
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    if (!url) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { method = 'GET', body, headers = {} } = optionsRef.current;
      const userId = getUserId();

      const fetchHeaders: HeadersInit = {
        'Content-Type': 'application/json',
        ...headers,
      };
      if (userId) {
        fetchHeaders['x-vp-user-id'] = userId;
      }

      const response = await fetch(url, {
        method,
        headers: fetchHeaders,
        credentials: 'include',
        body: body ? JSON.stringify(body) : undefined,
        signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `API error: ${response.status}`);
      }

      setData(data as T);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return; // Silently ignore aborted requests
      }
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    // Clear stale data immediately so downstream memos never see the
    // previous URL's response while the new request is in flight.
    setData(null);

    // Abort previous in-flight request when url changes or on unmount
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    fetchData(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for mutations (POST, PUT, DELETE)
 */
export function useMutation<T, V = Record<string, unknown>>(
  url: string,
  method: 'POST' | 'PUT' | 'DELETE' = 'POST'
): UseMutationResult<T, V> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (variables: V): Promise<T | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await apiFetch<T>(url, {
          method,
          body: variables as Record<string, unknown>,
        });
        setData(result);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [url, method]
  );

  return { mutate, data, loading, error };
}

// ============================================
// Characters API
// ============================================

interface Character {
  id: string;
  name: string;
  description: string | null;
  age: number;
  style: string;
  gender: string;
  tags: string[];
  isNsfw: boolean;
  likeCount: number;
  favoriteCount: number;
  usageCount: number;
  firstMessage?: string | null;
  systemPrompt?: string | null;
  characterAvatarUrl?: string | null;
  avatarUrls?: string[];
  createdAt: string;
  creator: {
    id: string;
    handle: string;
    avatarUrl: string | null;
  };
  avatarAsset: {
    url: string;
  } | null;
  loraModel?: {
    id: string;
    name: string;
    loraModelUrl: string | null;
    triggerWord: string | null;
    modelId?: string | null;
  } | null;
  metadata: Record<string, unknown> | null;
}

interface CharactersResponse {
  items: Character[];
  nextCursor: string | null;
  hasMore: boolean;
}

export function useCharacters(params: {
  limit?: number;
  style?: string;
  gender?: string;
} = {}) {
  const searchParams = new URLSearchParams();
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.style) searchParams.set('style', params.style);
  if (params.gender) searchParams.set('gender', params.gender);

  const url = `/api/characters?${searchParams.toString()}`;
  return useApi<CharactersResponse>(url);
}

export function useCharacter(id: string | null) {
  const url = id ? `/api/characters/${id}` : null;
  return useApi<{ character: Character }>(url);
}

// ============================================
// Templates API
// ============================================

interface StyleTemplate {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  prompt: string | null;
  category: string;
  creditCost: number;
  isNsfw: boolean;
  likeCount: number;
  favoriteCount: number;
  usageCount: number;
}

interface VideoTemplate {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  previewVideoUrl: string | null;
  prompt: string | null;
  category: string;
  videoGenerationType: 'IMAGE_TO_VIDEO' | 'TEXT_TO_VIDEO';
  creditCost: number;
  isNsfw: boolean;
  likeCount: number;
  favoriteCount: number;
  usageCount: number;
}

export function useStyleTemplates(params: { category?: string; limit?: number } = {}) {
  const searchParams = new URLSearchParams();
  if (params.category) searchParams.set('category', params.category);
  if (params.limit) searchParams.set('limit', String(params.limit));

  const url = `/api/templates/style?${searchParams.toString()}`;
  return useApi<{ items: StyleTemplate[] }>(url);
}

export function useVideoTemplates(params: {
  type?: 'IMAGE_TO_VIDEO' | 'TEXT_TO_VIDEO';
  limit?: number;
} = {}) {
  const searchParams = new URLSearchParams();
  if (params.type) searchParams.set('type', params.type);
  if (params.limit) searchParams.set('limit', String(params.limit));

  const url = `/api/templates/video?${searchParams.toString()}`;
  return useApi<{ items: VideoTemplate[] }>(url);
}

// ============================================
// AI Apps API
// ============================================

interface AIApp {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  thumbnailUrl: string | null;
  category: string | null;
  creditCost: number;
  isNsfw: boolean;
  isFeatured: boolean;
  likeCount: number;
  favoriteCount: number;
  usageCount: number;
}

export function useAIApps(params: { category?: string; limit?: number } = {}) {
  const searchParams = new URLSearchParams();
  if (params.category) searchParams.set('category', params.category);
  if (params.limit) searchParams.set('limit', String(params.limit));

  const url = `/api/apps?${searchParams.toString()}`;
  return useApi<{ items: AIApp[] }>(url);
}

export function useAIApp(slug: string | null) {
  const url = slug ? `/api/apps/${slug}` : null;
  return useApi<{ app: AIApp }>(url);
}

// ============================================
// Models API
// ============================================

interface AIModel {
  id: string;
  name: string;
  description: string | null;
  modelType: string;
  baseModel: string;
  thumbnailUrl: string | null;
  triggerWord: string | null;
  isPublic: boolean;
  isNsfw: boolean;
  likeCount: number;
  favoriteCount: number;
  usageCount: number;
  createdAt: string;
  creator: {
    id: string;
    handle: string;
    avatarUrl: string | null;
  };
}

export function useModels(params: {
  type?: string;
  baseModel?: string;
  limit?: number;
} = {}) {
  const searchParams = new URLSearchParams();
  if (params.type) searchParams.set('type', params.type);
  if (params.baseModel) searchParams.set('baseModel', params.baseModel);
  if (params.limit) searchParams.set('limit', String(params.limit));

  const url = `/api/models?${searchParams.toString()}`;
  return useApi<{ items: AIModel[]; nextCursor: string | null }>(url);
}

export function useModel(id: string | null) {
  const url = id ? `/api/models/${id}` : null;
  return useApi<{ model: AIModel }>(url);
}

// ============================================
// Decorations API
// ============================================

interface Decoration {
  id: string;
  name: string;
  description: string | null;
  type: string;
  imageUrl: string | null;
  cssClass: string | null;
  isPremium: boolean;
  price: number | null;
}

export function useDecorations(params: { type?: string } = {}) {
  const searchParams = new URLSearchParams();
  if (params.type) searchParams.set('type', params.type);

  const url = `/api/decorations?${searchParams.toString()}`;
  return useApi<{ items: Decoration[] }>(url);
}

export function useUserDecorations(params: { type?: string; equipped?: boolean } = {}) {
  const searchParams = new URLSearchParams();
  if (params.type) searchParams.set('type', params.type);
  if (params.equipped !== undefined) searchParams.set('equipped', String(params.equipped));

  const url = `/api/user/decorations?${searchParams.toString()}`;
  return useApi<{ items: { id: string; isEquipped: boolean; decoration: Decoration }[] }>(url);
}

// ============================================
// Community Feed API
// ============================================

interface CommunityFeedItem {
  id: string;
  userId: string;
  prompt: string | null;
  caption: string | null;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  asset: {
    id: string;
    type: string;
    url: string;
    width: number | null;
    height: number | null;
  };
  user: {
    id: string;
    handle: string;
    avatarUrl: string | null;
  };
}

export function useCommunityFeed(params: {
  sort?: 'LATEST' | 'TRENDING' | 'TOP';
  limit?: number;
} = {}) {
  const searchParams = new URLSearchParams();
  if (params.sort) searchParams.set('sort', params.sort);
  if (params.limit) searchParams.set('limit', String(params.limit));

  const url = `/api/community/feed?${searchParams.toString()}`;
  return useApi<{ items: CommunityFeedItem[]; nextCursor: string | null }>(url);
}

// ============================================
// Chat API
// ============================================

interface ChatThread {
  id: string;
  characterId: string;
  characterName: string;
  characterAvatarUrl: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  isPinned: boolean;
  isArchived: boolean;
  isMuted: boolean;
  createdAt: string;
  isNew?: boolean;
  firstMessage?: {
    id: string;
    role: 'USER' | 'ASSISTANT';
    content: string;
    createdAt: string;
  } | null;
  character?: {
    id: string;
    name: string;
    description: string | null;
    style: string;
  };
}

interface ChatMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export function useChatThreads(params: { archived?: boolean; pinned?: boolean } = {}) {
  const searchParams = new URLSearchParams();
  if (params.archived !== undefined) searchParams.set('archived', String(params.archived));
  if (params.pinned !== undefined) searchParams.set('pinned', String(params.pinned));

  const url = `/api/chat/threads?${searchParams.toString()}`;
  return useApi<{ items: ChatThread[] }>(url);
}

export function useChatThread(threadId: string | null) {
  const url = threadId ? `/api/chat/threads/${threadId}` : null;
  return useApi<{
    thread: ChatThread & {
      messages: ChatMessage[];
      character: {
        id: string;
        name: string;
        description: string | null;
        systemPrompt: string | null;
        firstMessage: string | null;
      } | null;
    };
  }>(url);
}

export function useChatMessages(threadId: string | null, params: { limit?: number } = {}) {
  const searchParams = new URLSearchParams();
  if (params.limit) searchParams.set('limit', String(params.limit));

  const url = threadId ? `/api/chat/threads/${threadId}/messages?${searchParams.toString()}` : null;
  return useApi<{ messages: ChatMessage[]; nextCursor: string | null; hasMore: boolean }>(url);
}

export function useCreateThread() {
  return useMutation<{ thread: ChatThread }, { characterId: string }>(
    '/api/chat/threads',
    'POST'
  );
}

export function useSendMessage(threadId: string) {
  return useMutation<
    { message: ChatMessage; aiResponse: ChatMessage | null },
    { content: string; mediaUrl?: string; mediaType?: string; imageStyle?: 'realistic' | 'anime' | 'cartoon' }
  >(`/api/chat/threads/${threadId}/messages`, 'POST');
}

// ============================================
// Subscription API
// ============================================

interface Subscription {
  id: string;
  plan: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
  monthlyCredits: number;
  creditsUsed: number;
  creditsRemaining: number;
}

export function useSubscription() {
  return useApi<{ subscription: Subscription }>('/api/subscription');
}

export function useCredits() {
  return useApi<{
    credits: {
      plan: string;
      total: number;
      used: number;
      remaining: number;
    };
  }>('/api/subscription/credits');
}

export function useUseCredits() {
  return useMutation<
    { success: boolean; credits: { used: number; remaining: number } },
    { amount: number; operation?: string }
  >('/api/subscription/credits', 'POST');
}

// ============================================
// Favorites API
// ============================================

interface Favorite {
  id: string;
  type: string;
  createdAt: string;
  item: Record<string, unknown>;
}

export function useFavorites(params: { type?: string } = {}) {
  const searchParams = new URLSearchParams();
  if (params.type) searchParams.set('type', params.type);

  const url = `/api/favorites?${searchParams.toString()}`;
  return useApi<{ items: Favorite[] }>(url);
}

export function useToggleFavorite() {
  const addFavorite = useMutation<
    { favorite: Favorite; favorited: boolean },
    { type: string; itemId: string }
  >('/api/favorites', 'POST');

  const removeFavorite = useMutation<
    { favorited: boolean; deleted: boolean },
    { type: string; itemId: string }
  >('/api/favorites', 'DELETE');

  return {
    add: addFavorite.mutate,
    remove: removeFavorite.mutate,
    loading: addFavorite.loading || removeFavorite.loading,
    error: addFavorite.error || removeFavorite.error,
  };
}

// ============================================
// Likes API
// ============================================

export function useLikes(params: { type?: string } = {}) {
  const searchParams = new URLSearchParams();
  if (params.type) searchParams.set('type', params.type);

  const url = `/api/likes?${searchParams.toString()}`;
  return useApi<{ items: { id: string; type: string; createdAt: string }[] }>(url);
}

export function useToggleLike() {
  const addLike = useMutation<
    { like: { id: string }; liked: boolean },
    { type: string; itemId: string }
  >('/api/likes', 'POST');

  const removeLike = useMutation<
    { liked: boolean; deleted: boolean },
    { type: string; itemId: string }
  >('/api/likes', 'DELETE');

  return {
    add: addLike.mutate,
    remove: removeLike.mutate,
    loading: addLike.loading || removeLike.loading,
    error: addLike.error || removeLike.error,
  };
}

// ============================================
// User Media API
// ============================================

interface UserMedia {
  id: string;
  title: string | null;
  prompt: string | null;
  visibility: string;
  isPostedToCommunity: boolean;
  createdAt: string;
  asset: {
    id: string;
    type: string;
    url: string;
    width: number | null;
    height: number | null;
  };
}

export function useUserMedia(params: { type?: string; limit?: number } = {}) {
  const searchParams = new URLSearchParams();
  if (params.type) searchParams.set('type', params.type);
  if (params.limit) searchParams.set('limit', String(params.limit));

  const url = `/api/user/media?${searchParams.toString()}`;
  return useApi<{ items: UserMedia[]; nextCursor: string | null }>(url);
}
