'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ChatContactsPanel from '@/components/chat/ChatContactsPanel';
import ChatConversationPanel from '@/components/chat/ChatConversationPanel';
import ChatContactDetailsPanel from '@/components/chat/ChatContactDetailsPanel';
import ChatUserConversationPanel from '@/components/chat/ChatUserConversationPanel';
import ChatUserDetailsPanel from '@/components/chat/ChatUserDetailsPanel';
import type {
  AIVideoType,
  ChatCharacterProfile,
  ChatCharacterSettings,
  ChatContact,
  ChatImageStyle,
  ChatMessage,
  ChatStats,
  ChatThread,
} from '@/types/chat';
import { DETAILS_PLACEHOLDER_IMAGE_URL, getChatCharacterProfile } from '@/data/chatCharacterProfiles';
import { apiFetch, getUserId, useCharacter, useChatThread, useChatThreads, useCreateThread } from '@/hooks/useApi';
import { getLastMessage } from '@/lib/chat/preview';
import { useUser } from '@/context/UserContext';
import { useAuth } from '@/context/AuthContext';
import { useDirectConversations } from '@/hooks/useDirectConversations';
import { cn } from '@/lib/utils';

type ChatShellProps = {
  activeChatId?: string;
  activeChatKind?: 'character' | 'user';
};

type ActiveUserProfile = {
  id: string;
  handle: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  avatarDecoration: string | null;
  avatarDecorationUrl: string | null;
  followersCount: number;
  followingCount: number;
  followStatus: 'none' | 'pending' | 'following';
};

const LAST_READ_STORAGE_KEY = 'vp.chat.lastReadByChatId';
const LAST_ACTIVITY_STORAGE_KEY = 'vp.chat.lastActivityAtByChatId';
const THREADS_STORAGE_KEY = 'vp.chat.threadsByChatId';
const EXTRA_CONTACTS_STORAGE_KEY = 'vp.chat.extraContacts';
const CLEARED_CHATS_STORAGE_KEY = 'vp.chat.clearedChatIds';
const STATS_STORAGE_KEY = 'vp.chat.statsByChatId';
const SETTINGS_STORAGE_KEY = 'vp.chat.settingsByChatId';

const DEFAULT_TEMPERATURE = 0.8;
const DEFAULT_MAX_MESSAGE_LENGTH = 1000;
const DEFAULT_VOICE_RATE = 1;
const DEFAULT_VOICE_PITCH = 1;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_STORED_THREADS = 40;
const MAX_STORED_MESSAGES_PER_THREAD = 200;
const MAX_EXTRA_CONTACTS = 40;
const DB_PREVIEW_MESSAGE_PREFIX = 'db-preview-';
const REGENERATE_PREFIX = '__vp_regenerate__:';
const IMAGE_FROM_AI_PREFIX = '__vp_image_from_ai__:';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function buildStorageKey(base: string, userId: string): string {
  const safeUserId = userId.trim();
  return safeUserId ? `${base}:${safeUserId}` : `${base}:anonymous`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseEpochMs(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseImageStyle(metadata: Record<string, unknown> | null | undefined): ChatImageStyle | undefined {
  if (!metadata) return undefined;
  const value = metadata.imageStyle;
  return value === 'realistic' || value === 'anime' || value === 'cartoon' ? value : undefined;
}

function mapDbMessageToChatMessage(message: {
  id: string;
  role: string;
  content: string;
  metadata: unknown;
  createdAt: string;
}): ChatMessage {
  const metadata = isRecord(message.metadata) ? message.metadata : null;
  const imageStyle = parseImageStyle(metadata);
  const mediaTypeRaw = typeof metadata?.mediaType === 'string' ? metadata.mediaType : undefined;
  const mediaType: ChatMessage['mediaType'] =
    mediaTypeRaw === 'IMAGE' || mediaTypeRaw === 'VIDEO' || mediaTypeRaw === 'AUDIO'
      ? mediaTypeRaw
      : undefined;
  const mediaUrl = typeof metadata?.mediaUrl === 'string' ? metadata.mediaUrl : undefined;
  const kind: ChatMessage['kind'] = imageStyle
    ? 'image'
    : mediaType === 'IMAGE' || (!mediaType && mediaUrl)
      ? 'image'
      : mediaType === 'VIDEO'
        ? 'video'
        : mediaType === 'AUDIO'
          ? 'audio'
          : 'text';

  return {
    id: message.id,
    role: message.role === 'USER' ? 'user' : 'ai',
    kind,
    text: message.content,
    createdAt: parseEpochMs(message.createdAt),
    imageUrl: mediaUrl,
    mediaType,
    imageStyle,
  };
}

function hashStringToNumber(input: string): number {
  // Fast, deterministic hash for stable demo-only defaults.
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

function buildDefaultSettings(): ChatCharacterSettings {
  return {
    temperature: DEFAULT_TEMPERATURE,
    maxMessageLength: DEFAULT_MAX_MESSAGE_LENGTH,
    voice: {
      rate: DEFAULT_VOICE_RATE,
      pitch: DEFAULT_VOICE_PITCH,
    },
  };
}

function readLastReadFromStorage(storageKey: string): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};

    const record = parsed as Record<string, unknown>;
    const sanitized: Record<string, string> = {};
    for (const [chatId, value] of Object.entries(record)) {
      if (typeof value === 'string') sanitized[chatId] = value;
    }
    return sanitized;
  } catch {
    return {};
  }
}

function readStatsFromStorage(storageKey: string): Record<string, ChatStats> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};

    const record = parsed as Record<string, unknown>;
    const sanitized: Record<string, ChatStats> = {};
    for (const [chatId, value] of Object.entries(record)) {
      if (!value || typeof value !== 'object') continue;
      const v = value as Partial<ChatStats>;
      if (
        typeof v.views === 'number' &&
        typeof v.likes === 'number' &&
        typeof v.conversations === 'number' &&
        typeof v.isLiked === 'boolean'
      ) {
        sanitized[chatId] = {
          views: v.views,
          likes: v.likes,
          conversations: v.conversations,
          isLiked: v.isLiked,
        };
      }
    }
    return sanitized;
  } catch {
    return {};
  }
}

function readSettingsFromStorage(storageKey: string): Record<string, ChatCharacterSettings> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};

    const record = parsed as Record<string, unknown>;
    const sanitized: Record<string, ChatCharacterSettings> = {};
    for (const [chatId, value] of Object.entries(record)) {
      if (!value || typeof value !== 'object') continue;
      const v = value as Partial<ChatCharacterSettings>;
      if (typeof v.temperature !== 'number' || typeof v.maxMessageLength !== 'number') continue;

      const voice = v.voice as Partial<ChatCharacterSettings['voice']> | undefined;
      const voiceRate = typeof voice?.rate === 'number' ? voice.rate : DEFAULT_VOICE_RATE;
      const voicePitch = typeof voice?.pitch === 'number' ? voice.pitch : DEFAULT_VOICE_PITCH;

      sanitized[chatId] = {
        temperature: clamp(v.temperature, 0, 2),
        maxMessageLength: clamp(v.maxMessageLength, 100, 5000),
        voice: {
          rate: clamp(voiceRate, 0.5, 2),
          pitch: clamp(voicePitch, 0, 2),
        },
      };
    }
    return sanitized;
  } catch {
    return {};
  }
}

function readLastActivityFromStorage(storageKey: string): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};

    const record = parsed as Record<string, unknown>;
    const sanitized: Record<string, number> = {};
    for (const [chatId, value] of Object.entries(record)) {
      if (typeof value === 'number' && Number.isFinite(value)) sanitized[chatId] = value;
    }
    return sanitized;
  } catch {
    return {};
  }
}

function readExtraContactsFromStorage(storageKey: string): ChatContact[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    const contacts: ChatContact[] = [];
    for (const entry of parsed) {
      if (!entry || typeof entry !== 'object') continue;
      const item = entry as Partial<ChatContact>;
      if (typeof item.id !== 'string') continue;
      if (typeof item.name !== 'string') continue;
      if (typeof item.avatarUrl !== 'string') continue;
      contacts.push({
        id: item.id,
        name: item.name,
        avatarUrl: item.avatarUrl,
        kind: item.kind === 'user' ? 'user' : 'character',
      });
      if (contacts.length >= MAX_EXTRA_CONTACTS) break;
    }
    return contacts;
  } catch {
    return [];
  }
}

function readClearedChatsFromStorage(storageKey: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();

    const ids = parsed.filter((value): value is string => typeof value === 'string');
    return new Set(ids);
  } catch {
    return new Set();
  }
}

function sanitizeMessage(value: unknown): ChatMessage | null {
  if (!value || typeof value !== 'object') return null;
  const msg = value as Partial<ChatMessage>;
  if (typeof msg.id !== 'string') return null;
  if (msg.role !== 'user' && msg.role !== 'ai') return null;
  if (typeof msg.text !== 'string') return null;

  const kind =
    msg.kind === 'image' || msg.kind === 'video' || msg.kind === 'audio' || msg.kind === 'text'
      ? msg.kind
      : undefined;
  const createdAt = typeof msg.createdAt === 'number' && Number.isFinite(msg.createdAt) ? msg.createdAt : undefined;
  const imageUrl = typeof msg.imageUrl === 'string' ? msg.imageUrl : undefined;
  const mediaType =
    msg.mediaType === 'IMAGE' || msg.mediaType === 'VIDEO' || msg.mediaType === 'AUDIO'
      ? msg.mediaType
      : undefined;
  const imageStyle = msg.imageStyle === 'realistic' || msg.imageStyle === 'anime' || msg.imageStyle === 'cartoon'
    ? msg.imageStyle
    : undefined;
  const timestampLabel = typeof msg.timestampLabel === 'string' ? msg.timestampLabel : undefined;

  return {
    id: msg.id,
    role: msg.role,
    kind,
    text: msg.text,
    createdAt,
    imageUrl,
    mediaType,
    imageStyle,
    timestampLabel,
  };
}

function readThreadsFromStorage(storageKey: string): Record<string, ChatThread> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};

    const record = parsed as Record<string, unknown>;
    const sanitized: Record<string, ChatThread> = {};

    for (const [chatId, value] of Object.entries(record)) {
      if (!value || typeof value !== 'object') continue;
      const v = value as Partial<ChatThread>;
      if (typeof v.chatId !== 'string') continue;
      if (!Array.isArray(v.messages)) continue;

      const messages: ChatMessage[] = [];
      for (const entry of v.messages) {
        const message = sanitizeMessage(entry);
        if (!message) continue;
        messages.push(message);
        if (messages.length >= MAX_STORED_MESSAGES_PER_THREAD) break;
      }

      sanitized[chatId] = {
        chatId: v.chatId,
        messages,
      };
    }

    return sanitized;
  } catch {
    return {};
  }
}

function buildInitialThreads(
  stored: Record<string, ChatThread>
): Record<string, ChatThread> {
  const initial: Record<string, ChatThread> = {};

  for (const [chatId, thread] of Object.entries(stored)) {
    initial[chatId] = thread;
  }

  return initial;
}

function serializeThreadsForStorage(
  threadsByChatId: Record<string, ChatThread>,
  clearedChats: Set<string>
): Record<string, ChatThread> {
  const candidates: ChatThread[] = [];

  for (const thread of Object.values(threadsByChatId)) {
    if (clearedChats.has(thread.chatId)) continue;
    if (thread.messages.length === 0) continue;
    candidates.push(thread);
  }

  candidates.sort((a, b) => {
    const lastA = getLastMessage(a);
    const lastB = getLastMessage(b);
    const scoreA = typeof lastA?.createdAt === 'number' ? lastA.createdAt : 0;
    const scoreB = typeof lastB?.createdAt === 'number' ? lastB.createdAt : 0;
    return scoreB - scoreA;
  });

  const trimmed = candidates.slice(0, MAX_STORED_THREADS);
  const result: Record<string, ChatThread> = {};

  for (const thread of trimmed) {
    const messages = thread.messages
      .slice(-MAX_STORED_MESSAGES_PER_THREAD)
      .map((msg) => ({
        id: msg.id,
        role: msg.role,
        kind: msg.kind,
        text: msg.text,
        createdAt: msg.createdAt,
        imageUrl: msg.imageUrl,
        mediaType: msg.mediaType,
        imageStyle: msg.imageStyle,
        timestampLabel: msg.timestampLabel,
      }));

    // Only persist threads with timestamped messages (avoid caching seeded demo content).
    if (!messages.some((msg) => typeof msg.createdAt === 'number' && Number.isFinite(msg.createdAt))) continue;

    result[thread.chatId] = { chatId: thread.chatId, messages };
  }

  return result;
}

export default function ChatShell({ activeChatId, activeChatKind = 'character' }: ChatShellProps) {
  const activeId = activeChatId?.trim() ?? '';
  const { userId, headers: userHeaders } = useUser();
  const { isAuthenticated } = useAuth();
  const isExplicitUserChat = activeChatKind === 'user';
  const shouldFetchActiveCharacter =
    Boolean(activeId) &&
    UUID_REGEX.test(activeId) &&
    !isExplicitUserChat &&
    true;
  const { data: activeCharacterData } = useCharacter(shouldFetchActiveCharacter ? activeId : null);

  const storageKeys = useMemo(
    () => ({
      lastRead: buildStorageKey(LAST_READ_STORAGE_KEY, userId),
      lastActivity: buildStorageKey(LAST_ACTIVITY_STORAGE_KEY, userId),
      threads: buildStorageKey(THREADS_STORAGE_KEY, userId),
      extraContacts: buildStorageKey(EXTRA_CONTACTS_STORAGE_KEY, userId),
      clearedChats: buildStorageKey(CLEARED_CHATS_STORAGE_KEY, userId),
      stats: buildStorageKey(STATS_STORAGE_KEY, userId),
      settings: buildStorageKey(SETTINGS_STORAGE_KEY, userId),
    }),
    [userId]
  );

  const resolvedUserId = userId || getUserId();
  const [activeUserProfile, setActiveUserProfile] = useState<ActiveUserProfile | null>(null);
  const [activeUserError, setActiveUserError] = useState<string | null>(null);
  const [activeUserLoading, setActiveUserLoading] = useState(false);

  // DM conversation tracking
  const { conversations: dmConversations } = useDirectConversations();
  const [dmConversationIdByUserId, setDmConversationIdByUserId] = useState<Record<string, string>>({});

  // Sync DM conversations into the conversationId map so the receiver always has it
  useEffect(() => {
    if (dmConversations.length === 0) return;
    setDmConversationIdByUserId((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const conv of dmConversations) {
        const otherUserId = conv.otherUser.id;
        if (!next[otherUserId]) {
          next[otherUserId] = conv.id;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [dmConversations]);

  // DM message previews for contact list
  const [dmPreviewByUserId, setDmPreviewByUserId] = useState<Record<string, { text: string; timestamp: number }>>({});

  // AI typing indicator state (tracks which chats are awaiting AI response)
  const [typingByChatId, setTypingByChatId] = useState<Record<string, boolean>>({});

  // Track generated images/videos for "My Generation" section
  const [myGenerationsByChatId, setMyGenerationsByChatId] = useState<
    Record<string, Array<{ url: string; type: 'image' | 'video'; createdAt: number }>>
  >({});

  // Use a ref for headers so the effect doesn't re-run when handle changes
  const hasValidHeaders = Boolean(userHeaders['x-vp-user-id']);
  const userHeadersRef = useRef(userHeaders);
  userHeadersRef.current = userHeaders;

  // Abort controller for generation polling loops — aborted on unmount
  const pollAbortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    pollAbortRef.current = new AbortController();
    return () => {
      pollAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!isExplicitUserChat || !UUID_REGEX.test(activeId)) {
      setActiveUserProfile(null);
      setActiveUserError(null);
      setActiveUserLoading(false);
      return;
    }

    if (!hasValidHeaders) {
      setActiveUserLoading(true);
      return;
    }

    let cancelled = false;
    setActiveUserLoading(true);
    setActiveUserError(null);

    void (async () => {
      try {
        const response = await fetch(`/api/user/${activeId}`, {
          headers: userHeadersRef.current,
          cache: 'no-store',
        });
        if (cancelled) return;
        if (response.status === 403) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(typeof errData?.message === 'string' ? errData.message : "You're blocked");
        }
        if (!response.ok) {
          throw new Error('Failed to load user');
        }
        const data = (await response.json()) as ActiveUserProfile;
        if (cancelled) return;
        setActiveUserProfile(data);
      } catch (err) {
        if (cancelled) return;
        setActiveUserProfile(null);
        setActiveUserError(err instanceof Error ? err.message : 'Failed to load user');
      } finally {
        if (!cancelled) setActiveUserLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeId, isExplicitUserChat, hasValidHeaders]);

  // Refetch user profile helper (used after follow/unfollow and on visibility change)
  const refetchActiveUserProfile = useCallback(() => {
    if (!isExplicitUserChat || !UUID_REGEX.test(activeId) || !hasValidHeaders) return;
    void fetch(`/api/user/${activeId}`, { headers: userHeadersRef.current, cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        setActiveUserProfile(data ?? null);
      })
      .catch(() => {});
  }, [activeId, isExplicitUserChat, hasValidHeaders]);

  // Refetch profile when user returns to the page (e.g. after visiting profile page and following)
  useEffect(() => {
    if (!isExplicitUserChat || !UUID_REGEX.test(activeId)) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refetchActiveUserProfile();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    // Also refetch on window focus (covers same-tab navigation back)
    window.addEventListener('focus', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [activeId, isExplicitUserChat, refetchActiveUserProfile]);

  const { data: dbThreadsData } = useChatThreads();
  const { mutate: createThread } = useCreateThread();
  const [dbThreadIdByChatId, setDbThreadIdByChatId] = useState<Record<string, string>>(() => ({}));
  const createThreadInFlightRef = useRef<Map<string, Promise<string | null>>>(new Map());

  useEffect(() => {
    const items = dbThreadsData?.items;
    if (!items) return;

    setDbThreadIdByChatId((prev) => {
      let changed = false;
      const next = { ...prev };

      for (const thread of items) {
        if (!thread || typeof thread !== 'object') continue;
        const record = thread as { id?: unknown; characterId?: unknown };
        if (typeof record.id !== 'string' || typeof record.characterId !== 'string') continue;
        if (next[record.characterId] === record.id) continue;
        next[record.characterId] = record.id;
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [dbThreadsData?.items]);

  const dbThreadByChatId = useMemo(() => {
    const map = new Map<
      string,
      {
        threadId: string;
        characterName: string;
        characterAvatarUrl: string;
        lastMessageAt?: number;
        lastMessagePreview?: string;
      }
    >();

    for (const item of dbThreadsData?.items ?? []) {
      if (!item || typeof item !== 'object') continue;
      const thread = item as {
        id?: unknown;
        characterId?: unknown;
        characterName?: unknown;
        characterAvatarUrl?: unknown;
        lastMessageAt?: unknown;
        lastMessagePreview?: unknown;
      };
      if (typeof thread.id !== 'string' || typeof thread.characterId !== 'string') continue;
      const rawName = typeof thread.characterName === 'string' ? thread.characterName.trim() : '';
      const name = rawName || thread.characterId;
      const rawAvatarUrl =
        typeof thread.characterAvatarUrl === 'string' ? thread.characterAvatarUrl.trim() : '';
      const avatarUrl = rawAvatarUrl || DETAILS_PLACEHOLDER_IMAGE_URL;
      const lastMessageAt = parseEpochMs(thread.lastMessageAt);
      const rawPreview =
        typeof thread.lastMessagePreview === 'string' ? thread.lastMessagePreview.trim() : '';
      const lastMessagePreview = rawPreview || undefined;

      map.set(thread.characterId, {
        threadId: thread.id,
        characterName: name,
        characterAvatarUrl: avatarUrl,
        lastMessageAt,
        lastMessagePreview,
      });
    }

    return map;
  }, [dbThreadsData?.items]);

  const inferredActiveContact = useMemo<ChatContact | null>(() => {
    if (!activeId) return null;

    if (isExplicitUserChat) {
      // Try profile handle first, then DM conversation handle, then truncated ID
      const dmConv = dmConversations.find((c) => c.otherUser.id === activeId);
      const name =
        activeUserProfile?.handle?.trim() ||
        dmConv?.otherUser.handle?.trim() ||
        activeId.slice(0, 8);
      const avatarUrl =
        activeUserProfile?.avatarUrl?.trim() ||
        dmConv?.otherUser.avatarUrl?.trim() ||
        '';
      return { id: activeId, name, avatarUrl, kind: 'user' };
    }

    const dummyMatch = activeId.match(/^dummy-(\d+)$/);
    const fallbackName = dummyMatch ? `Partner ${dummyMatch[1]}` : activeId;
    const name = activeCharacterData?.character?.name?.trim() || fallbackName;
    const avatarUrl =
      activeCharacterData?.character?.characterAvatarUrl ||
      activeCharacterData?.character?.avatarAsset?.url ||
      DETAILS_PLACEHOLDER_IMAGE_URL;
    return { id: activeId, name, avatarUrl, kind: 'character' };
  }, [isAuthenticated, activeCharacterData, activeId, activeUserProfile?.avatarUrl, activeUserProfile?.handle, isExplicitUserChat, dmConversations]);

  const [extraContacts, setExtraContacts] = useState<ChatContact[]>(() =>
    readExtraContactsFromStorage(storageKeys.extraContacts)
  );

  useEffect(() => {
    if (!inferredActiveContact) return;

    setExtraContacts((prev) => {
      const next = prev.slice();
      const index = next.findIndex((contact) => contact.id === inferredActiveContact.id);
      if (index === -1) {
        next.unshift(inferredActiveContact);
      } else {
        const existing = next[index]!;
        if (existing.name === inferredActiveContact.name && existing.avatarUrl === inferredActiveContact.avatarUrl) {
          return prev;
        }
        next[index] = inferredActiveContact;
      }

      const trimmed = next.slice(0, MAX_EXTRA_CONTACTS);
      try {
        window.localStorage.setItem(storageKeys.extraContacts, JSON.stringify(trimmed));
      } catch {
        // no-op
      }
      return trimmed;
    });
  }, [inferredActiveContact, storageKeys.extraContacts]);

  // Keep data memoized so the initial render stays fast even as the list grows.
  const contacts = useMemo<ChatContact[]>(() => {
    const byId = new Map<string, ChatContact>();

    // DB thread data: real character chats from the database
    for (const [chatId, thread] of dbThreadByChatId.entries()) {
      const existing = byId.get(chatId);
      if (existing) {
        byId.set(chatId, { ...existing, name: thread.characterName, avatarUrl: thread.characterAvatarUrl });
      } else {
        byId.set(chatId, {
          id: chatId,
          name: thread.characterName,
          avatarUrl: thread.characterAvatarUrl,
        });
      }
    }
    for (const contact of extraContacts) {
      if (!byId.has(contact.id)) byId.set(contact.id, contact);
    }

    // Add DM conversation participants so the receiver can see the conversation
    for (const conv of dmConversations) {
      const other = conv.otherUser;
      if (!byId.has(other.id)) {
        byId.set(other.id, {
          id: other.id,
          name: other.handle || `user_${other.id.slice(0, 6)}`,
          avatarUrl: other.avatarUrl || '',
          kind: 'user',
        });
      }
    }

    // inferredActiveContact comes from a fresh useCharacter() fetch — let it
    // override stale placeholder data so the avatar and name are up to date.
    if (inferredActiveContact) {
      const existing = byId.get(inferredActiveContact.id);
      if (existing) {
        byId.set(inferredActiveContact.id, { ...existing, ...inferredActiveContact });
      } else {
        byId.set(inferredActiveContact.id, inferredActiveContact);
      }
    }

    return Array.from(byId.values());
  }, [isAuthenticated, dbThreadByChatId, dmConversations, extraContacts, inferredActiveContact]);

  // Local in-memory threads for demo purposes.
  // When connected to a DB, you’ll typically fetch a conversation list endpoint that already includes:
  // lastMessage + unreadCount, then fetch the full thread only for the opened chat.
  const [clearedChats, setClearedChats] = useState<Set<string>>(() =>
    readClearedChatsFromStorage(storageKeys.clearedChats)
  );
  const [threadsByChatId, setThreadsByChatId] = useState<Record<string, ChatThread>>(() =>
    buildInitialThreads(
      readThreadsFromStorage(storageKeys.threads)
    )
  );

  // Persist read state so unread indicators behave consistently across navigations.
  const [lastReadMessageIdByChatId, setLastReadMessageIdByChatId] = useState<Record<string, string>>(
    () => readLastReadFromStorage(storageKeys.lastRead)
  );

  // Tracks which chat had recent message activity (sent/received) so the contact list can keep
  // the most relevant conversations at the top (common chat UX).
  const [lastActivityAtByChatId, setLastActivityAtByChatId] = useState<Record<string, number>>(
    () => readLastActivityFromStorage(storageKeys.lastActivity)
  );

  // Sync thread recency from the DB so the list ordering matches cross-device state.
  useEffect(() => {
    if (dbThreadByChatId.size === 0) return;
    setLastActivityAtByChatId((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const [chatId, thread] of dbThreadByChatId.entries()) {
        const lastMessageAt = thread.lastMessageAt ?? 0;
        const current = next[chatId] ?? 0;
        if (lastMessageAt <= current) continue;
        next[chatId] = lastMessageAt;
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [dbThreadByChatId]);

  // Sync DM conversation recency so DM contacts sort correctly
  useEffect(() => {
    if (dmConversations.length === 0) return;
    setLastActivityAtByChatId((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const conv of dmConversations) {
        if (!conv.lastMessageAt) continue;
        const lastMessageAt = new Date(conv.lastMessageAt).getTime();
        const otherUserId = conv.otherUser.id;
        const current = next[otherUserId] ?? 0;
        if (lastMessageAt <= current) continue;
        next[otherUserId] = lastMessageAt;
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [dmConversations]);

  // Character stats/settings are stored separately from the thread so they can be sourced
  // from your backend later without changing the UI components.
  const [statsByChatId, setStatsByChatId] = useState<Record<string, ChatStats>>(
    () => readStatsFromStorage(storageKeys.stats)
  );
  const [settingsByChatId, setSettingsByChatId] = useState<Record<string, ChatCharacterSettings>>(
    () => readSettingsFromStorage(storageKeys.settings)
  );

  useEffect(() => {
    const storedCleared = readClearedChatsFromStorage(storageKeys.clearedChats);
    const storedThreads = readThreadsFromStorage(storageKeys.threads);
    setClearedChats(storedCleared);
    setThreadsByChatId(buildInitialThreads(storedThreads));
    setExtraContacts(readExtraContactsFromStorage(storageKeys.extraContacts));
    setLastReadMessageIdByChatId(readLastReadFromStorage(storageKeys.lastRead));
    setLastActivityAtByChatId(readLastActivityFromStorage(storageKeys.lastActivity));
    setStatsByChatId(readStatsFromStorage(storageKeys.stats));
    setSettingsByChatId(readSettingsFromStorage(storageKeys.settings));
  }, [storageKeys, isAuthenticated]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem(storageKeys.lastRead, JSON.stringify(lastReadMessageIdByChatId));
      } catch {
        // Storage can fail in private mode / restricted environments; unread will still work for the session.
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [lastReadMessageIdByChatId, storageKeys.lastRead]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem(storageKeys.lastActivity, JSON.stringify(lastActivityAtByChatId));
      } catch {
        // no-op
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [lastActivityAtByChatId, storageKeys.lastActivity]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem(storageKeys.clearedChats, JSON.stringify(Array.from(clearedChats)));
      } catch {
        // no-op
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [clearedChats, storageKeys.clearedChats]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const serialized = serializeThreadsForStorage(threadsByChatId, clearedChats);
        window.localStorage.setItem(storageKeys.threads, JSON.stringify(serialized));
      } catch {
        // no-op
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [clearedChats, threadsByChatId, storageKeys.threads]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem(storageKeys.stats, JSON.stringify(statsByChatId));
      } catch {
        // no-op
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [statsByChatId, storageKeys.stats]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem(storageKeys.settings, JSON.stringify(settingsByChatId));
      } catch {
        // no-op
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [settingsByChatId, storageKeys.settings]);

  // Ensure new contacts always get defaults (useful in demo mode when you add more contacts).
  useEffect(() => {
    setStatsByChatId((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const contact of contacts) {
        if (!next[contact.id]) {
          next[contact.id] = buildDefaultStats(contact.id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });

    setLastActivityAtByChatId((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const contact of contacts) {
        if (!(contact.id in next)) {
          next[contact.id] = 0;
          changed = true;
        }
      }
      return changed ? next : prev;
    });

    setSettingsByChatId((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const contact of contacts) {
        if (!next[contact.id]) {
          next[contact.id] = buildDefaultSettings();
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [contacts]);

  const recordChatActivity = useCallback((chatId: string, activityAt: number) => {
    setLastActivityAtByChatId((prev) => {
      const current = prev[chatId] ?? 0;
      if (activityAt <= current) return prev;
      return { ...prev, [chatId]: activityAt };
    });
  }, []);

  // Derive a stable key that only changes when the last-message timestamp in any
  // thread changes — not when message *content* changes.  This prevents the
  // O(n log n) sort from re-running on every single incoming message.
  const threadTimestampKey = useMemo(() => {
    const parts: string[] = [];
    for (const chatId of Object.keys(threadsByChatId)) {
      const last = getLastMessage(threadsByChatId[chatId]);
      const ts = typeof last?.createdAt === 'number' ? last.createdAt : 0;
      parts.push(`${chatId}:${ts}`);
    }
    return parts.join('|');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally coarse dependency
  }, [threadsByChatId]);

  const sortedContacts = useMemo(() => {
    const baseIndex = new Map<string, number>();
    for (let index = 0; index < contacts.length; index += 1) {
      baseIndex.set(contacts[index]!.id, index);
    }

    const scoreForId = (chatId: string): number => {
      const lastActivity = lastActivityAtByChatId[chatId] ?? 0;
      const lastMessage = getLastMessage(threadsByChatId[chatId]);
      const lastMessageAt = typeof lastMessage?.createdAt === 'number' ? lastMessage.createdAt : 0;
      return Math.max(lastActivity, lastMessageAt);
    };

    const next = [...contacts];
    next.sort((a, b) => {
      const scoreA = scoreForId(a.id);
      const scoreB = scoreForId(b.id);
      if (scoreA !== scoreB) return scoreB - scoreA;
      return (baseIndex.get(a.id) ?? 0) - (baseIndex.get(b.id) ?? 0);
    });
    return next;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- threadTimestampKey is a stable proxy for threadsByChatId sort order
  }, [contacts, lastActivityAtByChatId, threadTimestampKey]);

  const threadsByChatIdForList = useMemo(() => {
    const hasDmPreviews = Object.keys(dmPreviewByUserId).length > 0;
    if (dbThreadByChatId.size === 0 && !hasDmPreviews) return threadsByChatId;

    // Create a shallow copy instead of using Object.create to ensure React detects changes
    const derived: Record<string, ChatThread | undefined> = { ...threadsByChatId };

    // Add DB thread previews for AI characters (only if newer than local cache)
    for (const [chatId, thread] of dbThreadByChatId.entries()) {
      if (clearedChats.has(chatId)) continue;
      if (!thread.lastMessageAt || !thread.lastMessagePreview) continue;
      const cachedLast = getLastMessage(threadsByChatId[chatId]);
      const cachedAt = typeof cachedLast?.createdAt === 'number' ? cachedLast.createdAt : 0;
      if (cachedAt >= thread.lastMessageAt) continue;

      derived[chatId] = {
        chatId,
        messages: [
          {
            id: `${DB_PREVIEW_MESSAGE_PREFIX}${thread.threadId}`,
            role: 'user',
            kind: 'text',
            text: thread.lastMessagePreview,
            createdAt: thread.lastMessageAt,
          },
        ],
      };
    }

    // Add DM previews from database conversations
    for (const conv of dmConversations) {
      const otherUserId = conv.otherUser.id;
      if (!conv.lastMessageAt || !conv.lastMessagePreview) continue;
      const ts = new Date(conv.lastMessageAt).getTime();
      const existingLocal = dmPreviewByUserId[otherUserId];
      // Only use DB preview if no newer local preview exists
      if (existingLocal && existingLocal.timestamp >= ts) continue;
      if (!derived[otherUserId]) {
        derived[otherUserId] = {
          chatId: otherUserId,
          messages: [
            {
              id: `dm-db-preview-${conv.id}`,
              role: 'user',
              kind: 'text',
              text: conv.lastMessagePreview,
              createdAt: ts,
            },
          ],
        };
      }
    }

    // Add DM previews for user-to-user chats (local overrides)
    for (const [userId, preview] of Object.entries(dmPreviewByUserId)) {
      derived[userId] = {
        chatId: userId,
        messages: [
          {
            id: `dm-preview-${userId}`,
            role: 'user',
            kind: 'text',
            text: preview.text,
            createdAt: preview.timestamp,
          },
        ],
      };
    }

    return derived;
  }, [clearedChats, dbThreadByChatId, dmConversations, dmPreviewByUserId, threadsByChatId]);

  const resolvedActiveId = useMemo(() => {
    if (activeChatId) return activeChatId;
    return sortedContacts[0]?.id ?? contacts[0]?.id;
  }, [activeChatId, contacts, sortedContacts]);

  const activeContact = useMemo(
    () => contacts.find((contact) => contact.id === resolvedActiveId),
    [contacts, resolvedActiveId]
  );
  const activeContactId = activeContact?.id;
  const isActiveUserChat = activeContact?.kind === 'user';

  const activeDbThreadId = useMemo(() => {
    if (!activeContactId) return undefined;
    if (isActiveUserChat) return undefined;
    if (!UUID_REGEX.test(activeContactId)) return undefined;
    return dbThreadIdByChatId[activeContactId];
  }, [activeContactId, dbThreadIdByChatId, isActiveUserChat]);

  const { data: activeDbThreadData } = useChatThread(activeDbThreadId ?? null);
  const activeThread = useMemo<ChatThread | undefined>(() => {
    if (!activeContactId) return undefined;
    return (
      threadsByChatId[activeContactId] ?? {
        chatId: activeContactId,
        messages: [],
      }
    );
  }, [activeContactId, threadsByChatId]);

  useEffect(() => {
    const thread = activeDbThreadData?.thread;
    if (!thread) return;
    if (!thread.characterId) return;
    if (!Array.isArray(thread.messages)) return;

    const chatId = thread.characterId;
    const messages = thread.messages.map((msg) =>
      mapDbMessageToChatMessage({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        metadata: msg.metadata,
        createdAt: msg.createdAt,
      })
    );

    setThreadsByChatId((prev) => {
      const current = prev[chatId];
      const currentLast = getLastMessage(current);
      const nextLast = messages[messages.length - 1];

      if (
        current &&
        current.messages.length === messages.length &&
        currentLast?.id === nextLast?.id
      ) {
        return prev;
      }

      return {
        ...prev,
        [chatId]: {
          chatId,
          messages,
        },
      };
    });

    setClearedChats((prev) => {
      if (!prev.has(chatId)) return prev;
      if (messages.length === 0) return prev;
      const next = new Set(prev);
      next.delete(chatId);
      return next;
    });

    setDbThreadIdByChatId((prev) => {
      if (prev[chatId] === thread.id) return prev;
      return { ...prev, [chatId]: thread.id };
    });
  }, [activeDbThreadData?.thread, setClearedChats, setThreadsByChatId]);
  const activeStats = activeContact
    ? (statsByChatId[activeContact.id] ?? buildDefaultStats(activeContact.id))
    : undefined;
  const activeSettings = activeContact
    ? (settingsByChatId[activeContact.id] ?? buildDefaultSettings())
    : undefined;

  const activeProfile = useMemo<ChatCharacterProfile | undefined>(() => {
    if (!activeContact) return undefined;
    if (activeContact.kind === 'user') return undefined;

    const fallback = getChatCharacterProfile({ chatId: activeContact.id, name: activeContact.name });
    const character = activeCharacterData?.character;

    if (!character || character.id !== activeContact.id) return fallback;

    return {
      ...fallback,
      introduction:
        typeof character.description === 'string' && character.description.trim().length > 0
          ? character.description
          : fallback.introduction,
      opener:
        typeof character.firstMessage === 'string' && character.firstMessage.trim().length > 0
          ? character.firstMessage
          : fallback.opener,
      systemPrompt:
        typeof character.systemPrompt === 'string' && character.systemPrompt.trim().length > 0
          ? character.systemPrompt
          : fallback.systemPrompt,
      communityImages:
        Array.isArray(character.avatarUrls) && character.avatarUrls.length > 0
          ? character.avatarUrls
          : fallback.communityImages,
    };
  }, [activeCharacterData?.character, activeContact]);

  // Mark a chat as read as soon as it becomes active.
  useEffect(() => {
    const activeId = activeContact?.id;
    if (!activeId || !activeThread) return;
    const lastMessage = getLastMessage(activeThread);
    if (!lastMessage) return;

    setLastReadMessageIdByChatId((prev) => {
      if (prev[activeId] === lastMessage.id) return prev;
      return { ...prev, [activeId]: lastMessage.id };
    });
  }, [activeContact?.id, activeThread]);

  const appendMessage = useCallback(
    (chatId: string, message: ChatMessage) => {
      setThreadsByChatId((prev) => {
        const current = prev[chatId] ?? { chatId, messages: [] };
        const nextThread: ChatThread = {
          ...current,
          messages: [...current.messages, message],
        };
        return { ...prev, [chatId]: nextThread };
      });

      // Only treat real message activity as "recent" (not merely opening/selecting a chat).
      const activityAt = typeof message.createdAt === 'number' ? message.createdAt : Date.now();
      recordChatActivity(chatId, activityAt);
    },
    [recordChatActivity]
  );

  const ensureDbThreadId = useCallback(
    async (chatId: string): Promise<string | null> => {
      if (!UUID_REGEX.test(chatId)) return null;

      const existing = dbThreadIdByChatId[chatId];
      if (existing) return existing;

      const inFlight = createThreadInFlightRef.current.get(chatId);
      if (inFlight) return inFlight;

      const promise = (async () => {
        const result = await createThread({ characterId: chatId });
        const threadId = result?.thread?.id ?? null;
        if (!threadId) return null;
        setDbThreadIdByChatId((prev) => {
          if (prev[chatId] === threadId) return prev;
          return { ...prev, [chatId]: threadId };
        });

        // Handle auto-sent first message from the character
        const firstMessage = result?.thread?.firstMessage as {
          id: string;
          role: string;
          content: string;
          createdAt: string;
        } | null | undefined;

        if (firstMessage && result?.thread?.isNew) {
          const aiMessage = mapDbMessageToChatMessage({
            id: firstMessage.id,
            role: firstMessage.role,
            content: firstMessage.content,
            metadata: null,
            createdAt: firstMessage.createdAt,
          });
          appendMessage(chatId, aiMessage);
        }

        return threadId;
      })();

      createThreadInFlightRef.current.set(chatId, promise);

      try {
        return await promise;
      } finally {
        createThreadInFlightRef.current.delete(chatId);
      }
    },
    [appendMessage, createThread, dbThreadIdByChatId]
  );

  // Ensure we can always resolve a DB thread for the active character, even if it is not in the
  // first page of `/api/chat/threads` (default limit is 20).
  useEffect(() => {
    if (!activeContactId) return;
    if (isActiveUserChat) return;
    if (!UUID_REGEX.test(activeContactId)) return;
    if (activeDbThreadId) return;
    void ensureDbThreadId(activeContactId);
  }, [activeContactId, activeDbThreadId, ensureDbThreadId, isActiveUserChat]);

  const handleSendText = useCallback(
    async (chatId: string, rawText: string) => {
      const isRegenerate = rawText.startsWith(REGENERATE_PREFIX);
      const text = isRegenerate ? rawText.slice(REGENERATE_PREFIX.length) : rawText;
      const now = Date.now();
      if (!text.trim()) return;

      if (isRegenerate) {
        const threadId = await ensureDbThreadId(chatId);
        if (!threadId) return;

        // Show typing indicator after a 1 second delay (feels more natural)
        const typingTimeout = setTimeout(() => {
          setTypingByChatId((prev) => ({ ...prev, [chatId]: true }));
        }, 1000);

        try {
          const result = await apiFetch<{
            message: { id: string; role: string; content: string; metadata: unknown; createdAt: string };
            aiResponse: { id: string; role: string; content: string; metadata: unknown; createdAt: string } | null;
          }>(`/api/chat/threads/${threadId}/messages`, {
            method: 'POST',
            body: { content: text },
          });

          if (result.aiResponse) {
            const aiMessage = mapDbMessageToChatMessage(result.aiResponse);
            const activityAt = typeof aiMessage.createdAt === 'number' ? aiMessage.createdAt : Date.now();

            // Replace the most recent AI message in-place (do not show duplicate user message
            // and do not append an additional AI message).
            setThreadsByChatId((prev) => {
              const current = prev[chatId];
              if (!current) return prev;

              let replaceIndex = -1;
              for (let index = current.messages.length - 1; index >= 0; index -= 1) {
                if (current.messages[index]?.role === 'ai') {
                  replaceIndex = index;
                  break;
                }
              }

              if (replaceIndex === -1) {
                return {
                  ...prev,
                  [chatId]: {
                    ...current,
                    messages: [...current.messages, aiMessage],
                  },
                };
              }

              const nextMessages = current.messages.slice();
              const existing = nextMessages[replaceIndex]!;

              nextMessages[replaceIndex] = {
                ...existing,
                kind: aiMessage.kind,
                text: aiMessage.text,
                createdAt: activityAt,
                imageUrl: aiMessage.imageUrl,
                mediaType: aiMessage.mediaType,
                imageStyle: aiMessage.imageStyle,
              };

              return {
                ...prev,
                [chatId]: {
                  ...current,
                  messages: nextMessages,
                },
              };
            });

            recordChatActivity(chatId, activityAt);
          }
        } catch {
          // If DB sync fails, keep the current UI unchanged.
        } finally {
          clearTimeout(typingTimeout);
          setTypingByChatId((prev) => ({ ...prev, [chatId]: false }));
        }

        return;
      }

      const optimisticId = `local-${now}`;
      setClearedChats((prev) => {
        if (!prev.has(chatId)) return prev;
        const next = new Set(prev);
        next.delete(chatId);
        return next;
      });
      appendMessage(chatId, {
        id: optimisticId,
        role: 'user',
        kind: 'text',
        text,
        createdAt: now,
      });

      setStatsByChatId((prev) => {
        const current = prev[chatId] ?? buildDefaultStats(chatId);
        const next: ChatStats = {
          ...current,
          conversations: current.conversations + 1,
        };
        return { ...prev, [chatId]: next };
      });

      const threadId = await ensureDbThreadId(chatId);
      if (!threadId) return;

      // Show typing indicator after a 1 second delay (feels more natural)
      const typingTimeout = setTimeout(() => {
        setTypingByChatId((prev) => ({ ...prev, [chatId]: true }));
      }, 1000);

      try {
        const result = await apiFetch<{
          message: { id: string; role: string; content: string; metadata: unknown; createdAt: string };
          aiResponse: { id: string; role: string; content: string; metadata: unknown; createdAt: string } | null;
        }>(`/api/chat/threads/${threadId}/messages`, {
          method: 'POST',
          body: { content: text },
        });

        const persisted = mapDbMessageToChatMessage(result.message);
        setThreadsByChatId((prev) => {
          const current = prev[chatId];
          if (!current) return prev;
          const index = current.messages.findIndex((msg) => msg.id === optimisticId);
          if (index === -1) return prev;
          const nextMessages = current.messages.slice();
          nextMessages[index] = persisted;
          return { ...prev, [chatId]: { ...current, messages: nextMessages } };
        });

        // Append AI response if present
        if (result.aiResponse) {
          const aiMessage = mapDbMessageToChatMessage(result.aiResponse);
          appendMessage(chatId, aiMessage);
        }
      } catch {
        // If DB sync fails, we still keep the local optimistic message (localStorage cache).
      } finally {
        // Clear the typing timeout and hide typing indicator
        clearTimeout(typingTimeout);
        setTypingByChatId((prev) => ({ ...prev, [chatId]: false }));
      }
    },
    [appendMessage, ensureDbThreadId, recordChatActivity]
  );

  const handleSendImage = useCallback(
    async (chatId: string, prompt: string, style: ChatImageStyle) => {
      const now = Date.now();
      const userMessageId = `local-user-${now}`;
      const aiMessageId = `local-ai-${now}`;
      const isImageFromAiResponse = prompt.startsWith(IMAGE_FROM_AI_PREFIX);
      const sourceText = (isImageFromAiResponse ? prompt.slice(IMAGE_FROM_AI_PREFIX.length) : prompt).trim();
      const contact = contacts.find((item) => item.id === chatId);
      const initImageUrl = contact?.avatarUrl?.trim() ?? '';

      setClearedChats((prev) => {
        if (!prev.has(chatId)) return prev;
        const next = new Set(prev);
        next.delete(chatId);
        return next;
      });

      if (!sourceText) return;

      if (!initImageUrl) {
        appendMessage(chatId, {
          id: aiMessageId,
          role: 'ai',
          kind: 'text',
          text: 'Failed to generate image: missing character image.',
          createdAt: now,
        });
        return;
      }

      if (!isImageFromAiResponse) {
        // Add user request message (composer image mode).
        appendMessage(chatId, {
          id: userMessageId,
          role: 'user',
          kind: 'text',
          text: `Generate ${style} image: ${sourceText}`,
          createdAt: now,
        });
      }

      // Add AI "generating" placeholder message
      appendMessage(chatId, {
        id: aiMessageId,
        role: 'ai',
        kind: 'image',
        text: `Generating ${style} image...`,
        imageStyle: style,
        createdAt: now + 1,
      });

      setStatsByChatId((prev) => {
        const current = prev[chatId] ?? buildDefaultStats(chatId);
        const next: ChatStats = {
          ...current,
          conversations: current.conversations + 1,
        };
        return { ...prev, [chatId]: next };
      });

      try {
        const promptResult = await apiFetch<{ success: boolean; prompt: string }>('/api/ai/image/prompt', {
          method: 'POST',
          body: { text: sourceText, style },
        });

        const generatedPrompt = promptResult.prompt?.trim();
        if (!promptResult.success || !generatedPrompt) {
          throw new Error('Failed to generate an image prompt');
        }

        type ImageEditApiResponse = {
          success: boolean;
          imageUrl: string | null;
          status: string;
          error?: string;
          job?: { id: string; trackId: number; webhookEnabled: boolean } | null;
        };

        const imageResult = await apiFetch<ImageEditApiResponse>('/api/ai/image/edit', {
          method: 'POST',
          body: { imageUrl: initImageUrl, prompt: generatedPrompt },
        });

        if (!imageResult.success) {
          throw new Error(imageResult.error || 'Failed to generate image');
        }

        const finalizeGeneration = async (finalImageUrl: string) => {
          // Update the AI message with the generated image URL
          // Use a new ID so the unread indicator shows if user switched chats
          const completedMessageId = `local-ai-complete-${Date.now()}`;
          setThreadsByChatId((prev) => {
            const current = prev[chatId];
            if (!current) return prev;
            const index = current.messages.findIndex((msg) => msg.id === aiMessageId);
            if (index === -1) return prev;
            const nextMessages = current.messages.slice();
            nextMessages[index] = {
              ...nextMessages[index]!,
              id: completedMessageId,
              text: generatedPrompt,
              imageUrl: finalImageUrl,
              createdAt: Date.now(),
            };
            return { ...prev, [chatId]: { ...current, messages: nextMessages } };
          });

          // Track in my generations
          setMyGenerationsByChatId((prev) => {
            const current = prev[chatId] ?? [];
            return {
              ...prev,
              [chatId]: [...current, { url: finalImageUrl, type: 'image', createdAt: Date.now() }],
            };
          });

          // Save to database
          const threadId = await ensureDbThreadId(chatId);
          if (threadId) {
            try {
              if (!isImageFromAiResponse) {
                await apiFetch(`/api/chat/threads/${threadId}/messages`, {
                  method: 'POST',
                  body: {
                    content: `Generate ${style} image: ${sourceText}`,
                    role: 'USER',
                    skipAiResponse: true,
                  },
                });
              }
              await apiFetch(`/api/chat/threads/${threadId}/messages`, {
                method: 'POST',
                body: {
                  content: generatedPrompt,
                  mediaUrl: finalImageUrl,
                  mediaType: 'IMAGE',
                  imageStyle: style,
                  role: 'ASSISTANT',
                  skipAiResponse: true,
                },
              });
            } catch {
              // Database save failed but image was generated
            }
          }
        };

        if (imageResult.status === 'success' && imageResult.imageUrl) {
          await finalizeGeneration(imageResult.imageUrl);
        } else if (imageResult.status === 'processing' && imageResult.job) {
          const jobId = imageResult.job.id;
          const pollForJob = async () => {
            const signal = pollAbortRef.current?.signal;
            const startedAt = Date.now();
            const initialDelayMs = 30_000;
            const pollIntervalMs = 5_000;
            const maxTotalMs = 5 * 60_000; // 5 minutes

            // Wait 30 seconds before first check
            await new Promise((resolve) => setTimeout(resolve, initialDelayMs));

            while (Date.now() - startedAt < maxTotalMs) {
              if (signal?.aborted) return;
              try {
                const jobResponse = await apiFetch<{
                  success: boolean;
                  job: { status: string; resultUrl?: string; errorMessage?: string };
                }>(`/api/jobs/${jobId}`);

                if (jobResponse.job.status === 'COMPLETED' && jobResponse.job.resultUrl) {
                  await finalizeGeneration(jobResponse.job.resultUrl);
                  return;
                }
                if (jobResponse.job.status === 'FAILED') {
                  throw new Error(jobResponse.job.errorMessage || 'Image generation failed');
                }
              } catch (pollError) {
                if (pollError instanceof Error && (
                  pollError.message.includes('Image generation failed') ||
                  pollError.message.includes('timed out')
                )) {
                  throw pollError;
                }
                // Network error — keep polling
              }
              await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
            }
            throw new Error('Image generation timed out');
          };

          pollForJob().catch((pollError) => {
            if (pollAbortRef.current?.signal.aborted) return;
            setThreadsByChatId((prev) => {
              const current = prev[chatId];
              if (!current) return prev;
              const index = current.messages.findIndex((msg) => msg.id === aiMessageId);
              if (index === -1) return prev;
              const nextMessages = current.messages.slice();
              nextMessages[index] = {
                ...nextMessages[index]!,
                text: `Failed to generate image: ${pollError instanceof Error ? pollError.message : 'Unknown error'}`,
                kind: 'text',
              };
              return { ...prev, [chatId]: { ...current, messages: nextMessages } };
            });
          });
        } else {
          throw new Error(imageResult.error || 'Failed to generate image');
        }
      } catch (error) {
        // Update AI message to show error
        setThreadsByChatId((prev) => {
          const current = prev[chatId];
          if (!current) return prev;
          const index = current.messages.findIndex((msg) => msg.id === aiMessageId);
          if (index === -1) return prev;
          const nextMessages = current.messages.slice();
          nextMessages[index] = {
            ...nextMessages[index]!,
            text: `Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`,
            kind: 'text',
          };
          return { ...prev, [chatId]: { ...current, messages: nextMessages } };
        });
      }
    },
    [appendMessage, contacts, ensureDbThreadId]
  );

  const handleSendVideo = useCallback(
    async (chatId: string, type: AIVideoType, file?: File, prompt?: string) => {
      const VIDEO_FROM_AI_PREFIX = '__vp_video_from_ai__:';
      const now = Date.now();
      const userMessageId = `local-user-video-${now}`;
      const aiMessageId = `local-ai-video-${now}`;

      setClearedChats((prev) => {
        if (!prev.has(chatId)) return prev;
        const next = new Set(prev);
        next.delete(chatId);
        return next;
      });

      const isVideoFromAiResponse = prompt?.startsWith(VIDEO_FROM_AI_PREFIX) ?? false;
      const sourceText = (isVideoFromAiResponse && prompt ? prompt.slice(VIDEO_FROM_AI_PREFIX.length) : (prompt || 'Generate video')).trim();
      const isImageToVideo = type === 'image-to-video' && file;
      const contact = contacts.find((item) => item.id === chatId);
      const initImageUrl = contact?.avatarUrl?.trim() ?? '';

      if (!sourceText) return;

      // For text-to-video from AI response, we need the character avatar (same as image flow)
      if (!isImageToVideo && !initImageUrl) {
        appendMessage(chatId, {
          id: aiMessageId,
          role: 'ai',
          kind: 'text',
          text: 'Failed to generate video: missing character image.',
          createdAt: now,
        });
        return;
      }

      if (!isVideoFromAiResponse) {
        appendMessage(chatId, {
          id: userMessageId,
          role: 'user',
          kind: 'text',
          text: isImageToVideo ? `Image to video: ${sourceText}` : `Generate video: ${sourceText}`,
          createdAt: now,
        });
      }

      // Add AI "generating" placeholder message
      appendMessage(chatId, {
        id: aiMessageId,
        role: 'ai',
        kind: 'video',
        text: 'Generating video... This may take a few minutes.',
        createdAt: now + 1,
      });

      setStatsByChatId((prev) => {
        const current = prev[chatId] ?? buildDefaultStats(chatId);
        const next: ChatStats = {
          ...current,
          conversations: current.conversations + 1,
        };
        return { ...prev, [chatId]: next };
      });

      try {
        type VideoApiResponse = {
          success: boolean;
          videoUrl: string | null;
          status: string;
          error?: string;
          job?: { id: string; trackId: number; webhookEnabled: boolean } | null;
        };

        let videoResult: VideoApiResponse;
        let generatedPrompt = sourceText;

        if (isImageToVideo) {
          // Image-to-video from composer: upload the file, then send to img2video
          const formData = new FormData();
          formData.append('file', file);

          const uploadResponse = await fetch('/api/uploads', {
            method: 'POST',
            headers: resolvedUserId ? { 'x-vp-user-id': resolvedUserId } : {},
            body: formData,
          });

          const uploadData = (await uploadResponse.json()) as { url?: string; error?: string };
          if (!uploadResponse.ok || !uploadData.url) {
            throw new Error(uploadData.error || 'Failed to upload image');
          }

          videoResult = await apiFetch<VideoApiResponse>('/api/ai/video/img2video', {
            method: 'POST',
            body: { imageUrl: uploadData.url, prompt: sourceText },
          });
        } else {
          // Text-to-video: 3-step flow
          // Step 1: Generate a detailed image prompt from the AI's text via LLM
          const promptResult = await apiFetch<{ success: boolean; prompt: string }>('/api/ai/image/prompt', {
            method: 'POST',
            body: { text: sourceText, style: 'realistic' },
          });

          generatedPrompt = promptResult.prompt?.trim() || '';
          if (!promptResult.success || !generatedPrompt) {
            throw new Error('Failed to generate an image prompt');
          }

          // Step 2: Generate an image using qwen_edit with the character's avatar
          const imageResult = await apiFetch<{
            success: boolean;
            imageUrl: string | null;
            status: string;
            error?: string;
            job?: { id: string; trackId: number; webhookEnabled: boolean } | null;
          }>('/api/ai/image/edit', {
            method: 'POST',
            body: { imageUrl: initImageUrl, prompt: generatedPrompt },
          });

          if (!imageResult.success) {
            throw new Error(imageResult.error || 'Failed to generate image for video');
          }

          // If image is processing async, poll until complete
          let finalImageUrl = imageResult.imageUrl;
          if (imageResult.status === 'processing' && imageResult.job) {
            const imgJobId = imageResult.job.id;
            const startedAt = Date.now();
            const maxTotalMs = 5 * 60_000;
            await new Promise((resolve) => setTimeout(resolve, 15_000)); // initial wait

            while (Date.now() - startedAt < maxTotalMs) {
              const jobResponse = await apiFetch<{
                success: boolean;
                job: { status: string; resultUrl?: string; errorMessage?: string };
              }>(`/api/jobs/${imgJobId}`);

              if (jobResponse.job.status === 'COMPLETED' && jobResponse.job.resultUrl) {
                finalImageUrl = jobResponse.job.resultUrl;
                break;
              }
              if (jobResponse.job.status === 'FAILED') {
                throw new Error(jobResponse.job.errorMessage || 'Image generation failed');
              }
              await new Promise((resolve) => setTimeout(resolve, 5_000));
            }

            if (!finalImageUrl) {
              throw new Error('Image generation timed out');
            }
          }

          if (!finalImageUrl) {
            throw new Error('Failed to generate image for video');
          }

          // Step 3: Send the generated image to img2video
          videoResult = await apiFetch<VideoApiResponse>('/api/ai/video/img2video', {
            method: 'POST',
            body: { imageUrl: finalImageUrl, prompt: generatedPrompt },
          });
        }

        if (!videoResult.success) {
          throw new Error(videoResult.error || 'Failed to generate video');
        }

        // Helper to finalize the video message in chat
        const finalizeVideo = async (videoUrl: string) => {
          const completedMessageId = `local-ai-video-complete-${Date.now()}`;
          setThreadsByChatId((prev) => {
            const current = prev[chatId];
            if (!current) return prev;
            const index = current.messages.findIndex((msg) => msg.id === aiMessageId);
            if (index === -1) return prev;
            const nextMessages = current.messages.slice();
            nextMessages[index] = {
              ...nextMessages[index]!,
              id: completedMessageId,
              text: generatedPrompt,
              imageUrl: videoUrl,
              mediaType: 'VIDEO',
              createdAt: Date.now(),
            };
            return { ...prev, [chatId]: { ...current, messages: nextMessages } };
          });

          setMyGenerationsByChatId((prev) => {
            const current = prev[chatId] ?? [];
            return {
              ...prev,
              [chatId]: [...current, { url: videoUrl, type: 'video' as const, createdAt: Date.now() }],
            };
          });

          const threadId = await ensureDbThreadId(chatId);
          if (threadId) {
            try {
              if (!isVideoFromAiResponse) {
                await apiFetch(`/api/chat/threads/${threadId}/messages`, {
                  method: 'POST',
                  body: {
                    content: isImageToVideo ? `Image to video: ${sourceText}` : `Generate video: ${sourceText}`,
                    role: 'USER',
                    skipAiResponse: true,
                  },
                });
              }
              await apiFetch(`/api/chat/threads/${threadId}/messages`, {
                method: 'POST',
                body: {
                  content: generatedPrompt,
                  mediaUrl: videoUrl,
                  mediaType: 'VIDEO',
                  role: 'ASSISTANT',
                  skipAiResponse: true,
                },
              });
            } catch {
              // Database save failed but video was generated
            }
          }
        };

        if (videoResult.status === 'success' && videoResult.videoUrl) {
          await finalizeVideo(videoResult.videoUrl);
        } else if (videoResult.status === 'processing' && videoResult.job) {
          const jobId = videoResult.job.id;
          const pollForJob = async () => {
            const signal = pollAbortRef.current?.signal;
            await new Promise((resolve) => setTimeout(resolve, 30_000));

            const pollInterval = 10_000;
            const maxAttempts = 57; // ~10 minutes
            for (let attempt = 0; attempt < maxAttempts; attempt++) {
              if (signal?.aborted) return;
              try {
                const jobResponse = await apiFetch<{
                  success: boolean;
                  job: { status: string; resultUrl?: string; errorMessage?: string };
                }>(`/api/jobs/${jobId}`);

                if (jobResponse.job.status === 'COMPLETED' && jobResponse.job.resultUrl) {
                  await finalizeVideo(jobResponse.job.resultUrl);
                  return;
                }
                if (jobResponse.job.status === 'FAILED') {
                  throw new Error(jobResponse.job.errorMessage || 'Video generation failed');
                }
              } catch (pollError) {
                if (pollError instanceof Error && (
                  pollError.message.includes('Video generation failed') ||
                  pollError.message.includes('timed out')
                )) {
                  throw pollError;
                }
              }
              await new Promise((resolve) => setTimeout(resolve, pollInterval));
            }
            throw new Error('Video generation timed out');
          };

          pollForJob().catch((pollError) => {
            if (pollAbortRef.current?.signal.aborted) return;
            setThreadsByChatId((prev) => {
              const current = prev[chatId];
              if (!current) return prev;
              const index = current.messages.findIndex((msg) => msg.id === aiMessageId);
              if (index === -1) return prev;
              const nextMessages = current.messages.slice();
              nextMessages[index] = {
                ...nextMessages[index]!,
                text: `Failed to generate video: ${pollError instanceof Error ? pollError.message : 'Unknown error'}`,
                kind: 'text',
              };
              return { ...prev, [chatId]: { ...current, messages: nextMessages } };
            });
          });
        } else {
          throw new Error(videoResult.error || 'Failed to generate video');
        }
      } catch (error) {
        setThreadsByChatId((prev) => {
          const current = prev[chatId];
          if (!current) return prev;
          const index = current.messages.findIndex((msg) => msg.id === aiMessageId);
          if (index === -1) return prev;
          const nextMessages = current.messages.slice();
          nextMessages[index] = {
            ...nextMessages[index]!,
            text: `Failed to generate video: ${error instanceof Error ? error.message : 'Unknown error'}`,
            kind: 'text',
          };
          return { ...prev, [chatId]: { ...current, messages: nextMessages } };
        });
      }
    },
    [appendMessage, contacts, ensureDbThreadId, resolvedUserId]
  );

  const handleSendAIEdit = useCallback(
    async (chatId: string, file: File, prompt: string) => {
      // AI Edit uses the same image generation API but with an input image
      // For now, we'll show a placeholder - this would need a separate API endpoint
      const now = Date.now();
      const userMessageId = `local-user-edit-${now}`;
      const aiMessageId = `local-ai-edit-${now}`;

      setClearedChats((prev) => {
        if (!prev.has(chatId)) return prev;
        const next = new Set(prev);
        next.delete(chatId);
        return next;
      });

      // Add user request message with the original image preview
      const previewUrl = URL.createObjectURL(file);
      appendMessage(chatId, {
        id: userMessageId,
        role: 'user',
        kind: 'image',
        text: `AI Edit: ${prompt}`,
        imageUrl: previewUrl,
        createdAt: now,
      });

      // Add AI "generating" placeholder message
      appendMessage(chatId, {
        id: aiMessageId,
        role: 'ai',
        kind: 'image',
        text: 'Editing image...',
        createdAt: now + 1,
      });

      setStatsByChatId((prev) => {
        const current = prev[chatId] ?? buildDefaultStats(chatId);
        const next: ChatStats = {
          ...current,
          conversations: current.conversations + 1,
        };
        return { ...prev, [chatId]: next };
      });

      try {
        // First upload the source image
        const formData = new FormData();
        formData.append('file', file);

        const uploadResponse = await fetch('/api/uploads', {
          method: 'POST',
          headers: resolvedUserId ? { 'x-vp-user-id': resolvedUserId } : {},
          body: formData,
        });

        const uploadData = (await uploadResponse.json()) as { url?: string; error?: string };
        if (!uploadResponse.ok || !uploadData.url) {
          throw new Error(uploadData.error || 'Failed to upload image');
        }

        // Call the AI Edit API with the uploaded image URL and edit prompt
        type ImageEditApiResponse = {
          success: boolean;
          imageUrl: string | null;
          status: string;
          error?: string;
          job?: { id: string; trackId: number; webhookEnabled: boolean } | null;
        };

        const imageResult = await apiFetch<ImageEditApiResponse>('/api/ai/image/edit', {
          method: 'POST',
          body: { imageUrl: uploadData.url, prompt },
        });

        if (!imageResult.success) {
          throw new Error(imageResult.error || 'Failed to edit image');
        }

        const finalizeEdit = async (finalImageUrl: string) => {
          // Update the AI message with the edited image URL
          const completedMessageId = `local-ai-edit-complete-${Date.now()}`;
          setThreadsByChatId((prev) => {
            const current = prev[chatId];
            if (!current) return prev;
            const index = current.messages.findIndex((msg) => msg.id === aiMessageId);
            if (index === -1) return prev;
            const nextMessages = current.messages.slice();
            nextMessages[index] = {
              ...nextMessages[index]!,
              id: completedMessageId,
              text: prompt,
              imageUrl: finalImageUrl,
              createdAt: Date.now(),
            };
            return { ...prev, [chatId]: { ...current, messages: nextMessages } };
          });

          // Track in my generations
          setMyGenerationsByChatId((prev) => {
            const current = prev[chatId] ?? [];
            return {
              ...prev,
              [chatId]: [...current, { url: finalImageUrl, type: 'image', createdAt: Date.now() }],
            };
          });

          // Save to database
          const threadId = await ensureDbThreadId(chatId);
          if (threadId) {
            try {
              await apiFetch(`/api/chat/threads/${threadId}/messages`, {
                method: 'POST',
                body: {
                  content: `AI Edit: ${prompt}`,
                  mediaUrl: uploadData.url,
                  mediaType: 'IMAGE',
                  role: 'USER',
                  skipAiResponse: true,
                },
              });
              await apiFetch(`/api/chat/threads/${threadId}/messages`, {
                method: 'POST',
                body: {
                  content: prompt,
                  mediaUrl: finalImageUrl,
                  mediaType: 'IMAGE',
                  role: 'ASSISTANT',
                  skipAiResponse: true,
                },
              });
            } catch {
              // Database save failed but edit was generated
            }
          }
        };

        if (imageResult.status === 'success' && imageResult.imageUrl) {
          await finalizeEdit(imageResult.imageUrl);
        } else if (imageResult.status === 'processing' && imageResult.job) {
          const jobId = imageResult.job.id;
          const pollForJob = async () => {
            const signal = pollAbortRef.current?.signal;
            const startedAt = Date.now();
            const initialDelayMs = 30_000;
            const pollIntervalMs = 5_000;
            const maxTotalMs = 5 * 60_000; // 5 minutes

            // Wait 30 seconds before first check
            await new Promise((resolve) => setTimeout(resolve, initialDelayMs));

            while (Date.now() - startedAt < maxTotalMs) {
              if (signal?.aborted) return;
              try {
                const jobResponse = await apiFetch<{
                  success: boolean;
                  job: { status: string; resultUrl?: string; errorMessage?: string };
                }>(`/api/jobs/${jobId}`);

                if (jobResponse.job.status === 'COMPLETED' && jobResponse.job.resultUrl) {
                  await finalizeEdit(jobResponse.job.resultUrl);
                  return;
                }
                if (jobResponse.job.status === 'FAILED') {
                  throw new Error(jobResponse.job.errorMessage || 'Image edit failed');
                }
              } catch (pollError) {
                if (pollError instanceof Error && (
                  pollError.message.includes('Image edit failed') ||
                  pollError.message.includes('timed out')
                )) {
                  throw pollError;
                }
                // Network error — keep polling
              }
              await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
            }
            throw new Error('Image edit timed out');
          };

          pollForJob().catch((pollError) => {
            if (pollAbortRef.current?.signal.aborted) return;
            setThreadsByChatId((prev) => {
              const current = prev[chatId];
              if (!current) return prev;
              const index = current.messages.findIndex((msg) => msg.id === aiMessageId);
              if (index === -1) return prev;
              const nextMessages = current.messages.slice();
              nextMessages[index] = {
                ...nextMessages[index]!,
                text: `Failed to edit image: ${pollError instanceof Error ? pollError.message : 'Unknown error'}`,
                kind: 'text',
              };
              return { ...prev, [chatId]: { ...current, messages: nextMessages } };
            });
          });
        } else {
          throw new Error(imageResult.error || 'Failed to edit image');
        }
      } catch (error) {
        // Update AI message to show error
        setThreadsByChatId((prev) => {
          const current = prev[chatId];
          if (!current) return prev;
          const index = current.messages.findIndex((msg) => msg.id === aiMessageId);
          if (index === -1) return prev;
          const nextMessages = current.messages.slice();
          nextMessages[index] = {
            ...nextMessages[index]!,
            text: `Failed to edit image: ${error instanceof Error ? error.message : 'Unknown error'}`,
            kind: 'text',
          };
          return { ...prev, [chatId]: { ...current, messages: nextMessages } };
        });
      }
    },
    [appendMessage, ensureDbThreadId, resolvedUserId]
  );

  const handleAskGenerate = useCallback(
    async (chatId: string, label: string) => {
      const now = Date.now();
      const userMessageId = `local-user-ask-${now}`;
      const aiMessageId = `local-ai-ask-${now}`;
      const promptText = label.replace(/^[^\w]+/, '').trim(); // strip emoji prefix

      if (!promptText) return;

      const contact = contacts.find((c) => c.id === chatId);
      const character = activeCharacterData?.character;
      const loraModel = character?.loraModel;
      const initImageUrl = contact?.avatarUrl?.trim() ?? '';

      setClearedChats((prev) => {
        if (!prev.has(chatId)) return prev;
        const next = new Set(prev);
        next.delete(chatId);
        return next;
      });

      // Add user message
      appendMessage(chatId, {
        id: userMessageId,
        role: 'user',
        kind: 'text',
        text: label,
        createdAt: now,
      });

      // Add placeholder
      appendMessage(chatId, {
        id: aiMessageId,
        role: 'ai',
        kind: 'image',
        text: 'Generating image...',
        createdAt: now + 1,
      });

      setStatsByChatId((prev) => {
        const current = prev[chatId] ?? buildDefaultStats(chatId);
        return { ...prev, [chatId]: { ...current, conversations: current.conversations + 1 } };
      });

      try {
        // Step 1: Generate a detailed prompt via LLM
        const promptResult = await apiFetch<{ success: boolean; prompt: string }>('/api/ai/image/prompt', {
          method: 'POST',
          body: { text: promptText, style: 'realistic' },
        });

        let generatedPrompt = promptResult.prompt?.trim() || '';
        if (!promptResult.success || !generatedPrompt) {
          throw new Error('Failed to generate an image prompt');
        }

        type ImageApiResponse = {
          success: boolean;
          imageUrl: string | null;
          imageUrls?: string[];
          status: string;
          error?: string;
          job?: { id: string; trackId: number; webhookEnabled: boolean } | null;
        };

        let imageResult: ImageApiResponse;

        if (loraModel?.loraModelUrl && loraModel?.triggerWord) {
          // LoRA path: prepend trigger word, use text2img with LoRA
          generatedPrompt = `${loraModel.triggerWord}, ${generatedPrompt}`;
          imageResult = await apiFetch<ImageApiResponse>('/api/ai/image', {
            method: 'POST',
            body: {
              prompt: generatedPrompt,
              style: 'realistic',
              lora_model: loraModel.loraModelUrl,
              lora_strength: 0.8,
            },
          });
        } else {
          // No LoRA: use qwen_edit with character avatar
          if (!initImageUrl) {
            throw new Error('Missing character image');
          }
          imageResult = await apiFetch<ImageApiResponse>('/api/ai/image/edit', {
            method: 'POST',
            body: { imageUrl: initImageUrl, prompt: generatedPrompt },
          });
        }

        if (!imageResult.success) {
          throw new Error(imageResult.error || 'Failed to generate image');
        }

        const finalizeAskImage = async (finalImageUrl: string) => {
          const completedMessageId = `local-ai-ask-complete-${Date.now()}`;
          setThreadsByChatId((prev) => {
            const current = prev[chatId];
            if (!current) return prev;
            const index = current.messages.findIndex((msg) => msg.id === aiMessageId);
            if (index === -1) return prev;
            const nextMessages = current.messages.slice();
            nextMessages[index] = {
              ...nextMessages[index]!,
              id: completedMessageId,
              text: generatedPrompt,
              imageUrl: finalImageUrl,
              createdAt: Date.now(),
            };
            return { ...prev, [chatId]: { ...current, messages: nextMessages } };
          });

          setMyGenerationsByChatId((prev) => {
            const current = prev[chatId] ?? [];
            return { ...prev, [chatId]: [...current, { url: finalImageUrl, type: 'image', createdAt: Date.now() }] };
          });

          const threadId = await ensureDbThreadId(chatId);
          if (threadId) {
            try {
              await apiFetch(`/api/chat/threads/${threadId}/messages`, {
                method: 'POST',
                body: { content: label, role: 'USER', skipAiResponse: true },
              });
              await apiFetch(`/api/chat/threads/${threadId}/messages`, {
                method: 'POST',
                body: { content: generatedPrompt, mediaUrl: finalImageUrl, mediaType: 'IMAGE', role: 'ASSISTANT', skipAiResponse: true },
              });
            } catch {
              // DB save failed but image was generated
            }
          }
        };

        if (imageResult.status === 'success' && imageResult.imageUrl) {
          await finalizeAskImage(imageResult.imageUrl);
        } else if (imageResult.status === 'processing' && imageResult.job) {
          const jobId = imageResult.job.id;
          const pollForJob = async () => {
            const signal = pollAbortRef.current?.signal;
            const startedAt = Date.now();
            await new Promise((resolve) => setTimeout(resolve, 30_000));
            while (Date.now() - startedAt < 5 * 60_000) {
              if (signal?.aborted) return;
              try {
                const jobResponse = await apiFetch<{
                  success: boolean;
                  job: { status: string; resultUrl?: string; errorMessage?: string };
                }>(`/api/jobs/${jobId}`);
                if (jobResponse.job.status === 'COMPLETED' && jobResponse.job.resultUrl) {
                  await finalizeAskImage(jobResponse.job.resultUrl);
                  return;
                }
                if (jobResponse.job.status === 'FAILED') {
                  throw new Error(jobResponse.job.errorMessage || 'Image generation failed');
                }
              } catch (pollError) {
                if (pollError instanceof Error && (pollError.message.includes('failed') || pollError.message.includes('timed out'))) throw pollError;
              }
              await new Promise((resolve) => setTimeout(resolve, 5_000));
            }
            throw new Error('Image generation timed out');
          };

          pollForJob().catch((pollError) => {
            if (pollAbortRef.current?.signal.aborted) return;
            setThreadsByChatId((prev) => {
              const current = prev[chatId];
              if (!current) return prev;
              const index = current.messages.findIndex((msg) => msg.id === aiMessageId);
              if (index === -1) return prev;
              const nextMessages = current.messages.slice();
              nextMessages[index] = { ...nextMessages[index]!, text: `Failed to generate image: ${pollError instanceof Error ? pollError.message : 'Unknown error'}`, kind: 'text' };
              return { ...prev, [chatId]: { ...current, messages: nextMessages } };
            });
          });
        } else {
          throw new Error(imageResult.error || 'Failed to generate image');
        }
      } catch (error) {
        setThreadsByChatId((prev) => {
          const current = prev[chatId];
          if (!current) return prev;
          const index = current.messages.findIndex((msg) => msg.id === aiMessageId);
          if (index === -1) return prev;
          const nextMessages = current.messages.slice();
          nextMessages[index] = { ...nextMessages[index]!, text: `Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`, kind: 'text' };
          return { ...prev, [chatId]: { ...current, messages: nextMessages } };
        });
      }
    },
    [activeCharacterData, appendMessage, contacts, ensureDbThreadId]
  );

  const handleAskVideo = useCallback(
    (chatId: string, label: string) => {
      const promptText = label.replace(/^[^\w]+/, '').trim();
      if (!promptText) return;
      const VIDEO_FROM_AI_PREFIX = '__vp_video_from_ai__:';
      handleSendVideo(chatId, 'text-to-video', undefined, `${VIDEO_FROM_AI_PREFIX}${promptText}`);
    },
    [handleSendVideo]
  );

  const uploadChatMedia = useCallback(async (file: File): Promise<{ url: string; mediaType: ChatMessage['mediaType'] }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/uploads', {
      method: 'POST',
      headers: resolvedUserId ? { 'x-vp-user-id': resolvedUserId } : {},
      body: formData,
    });

    const data = (await response.json()) as { url?: string; mediaType?: ChatMessage['mediaType']; error?: string };
    if (!response.ok || !data.url) {
      throw new Error(data.error || 'Upload failed.');
    }

    return { url: data.url, mediaType: data.mediaType };
  }, [resolvedUserId]);

  const handleSendMedia = useCallback(
    async (chatId: string, items: Array<{ file: File; mediaType: NonNullable<ChatMessage['mediaType']> }>) => {
      if (items.length === 0) return;

      const base = Date.now();
      setClearedChats((prev) => {
        if (!prev.has(chatId)) return prev;
        const next = new Set(prev);
        next.delete(chatId);
        return next;
      });

      for (let index = 0; index < items.length; index += 1) {
        const { file, mediaType } = items[index]!;
        const now = Date.now();
        const optimisticId = `local-${base}-${index}`;
        const previewUrl = URL.createObjectURL(file);
        const kind: ChatMessage['kind'] =
          mediaType === 'VIDEO' ? 'video' : mediaType === 'AUDIO' ? 'audio' : 'image';

        appendMessage(chatId, {
          id: optimisticId,
          role: 'user',
          kind,
          text: '',
          imageUrl: previewUrl,
          mediaType,
          createdAt: now,
        });

        setStatsByChatId((prev) => {
          const current = prev[chatId] ?? buildDefaultStats(chatId);
          const next: ChatStats = {
            ...current,
            conversations: current.conversations + 1,
          };
          return { ...prev, [chatId]: next };
        });

        const threadId = await ensureDbThreadId(chatId);
        if (!threadId) return;

        try {
          const uploaded = await uploadChatMedia(file);
          const result = await apiFetch<{
            message: { id: string; role: string; content: string; metadata: unknown; createdAt: string };
            aiResponse: unknown | null;
          }>(`/api/chat/threads/${threadId}/messages`, {
            method: 'POST',
            body: { content: '', mediaUrl: uploaded.url, mediaType },
          });

          const persisted = mapDbMessageToChatMessage(result.message);
          setThreadsByChatId((prev) => {
            const current = prev[chatId];
            if (!current) return prev;
            const msgIndex = current.messages.findIndex((msg) => msg.id === optimisticId);
            if (msgIndex === -1) return prev;
            const nextMessages = current.messages.slice();
            nextMessages[msgIndex] = persisted;
            return { ...prev, [chatId]: { ...current, messages: nextMessages } };
          });

          URL.revokeObjectURL(previewUrl);
        } catch (error) {
          console.error('Error sending media message:', error);
        }
      }
    },
    [appendMessage, ensureDbThreadId, uploadChatMedia]
  );

  // Each time a user opens a character chat, count it as a "view" (demo behavior).
  // When connected to a DB, this should be tracked server-side.
  useEffect(() => {
    if (isActiveUserChat) return;
    const activeId = activeContact?.id;
    if (!activeId) return;
    setStatsByChatId((prev) => {
      const current = prev[activeId] ?? buildDefaultStats(activeId);
      return {
        ...prev,
        [activeId]: {
          ...current,
          views: current.views + 1,
        },
      };
    });
  }, [activeContact?.id, isActiveUserChat]);

  // Fetch or create DM conversation when opening a user chat
  useEffect(() => {
    if (!isActiveUserChat) return;
    const userId = activeContact?.id;
    if (!userId) return;
    if (!UUID_REGEX.test(userId)) return;

    // NOTE: Do NOT call recordChatActivity here - activity should only be recorded
    // when a message is actually sent or received, not when opening a chat.
    // This matches the AI character behavior.

    if (dmConversationIdByUserId[userId]) return; // Already have conversation ID

    // Fetch or create conversation
    apiFetch<{ conversation: { id: string } }>('/api/dm/conversations', {
      method: 'POST',
      body: { recipientId: userId },
    })
      .then((response) => {
        setDmConversationIdByUserId((prev) => ({
          ...prev,
          [userId]: response.conversation.id,
        }));
      })
      .catch((error) => {
        console.error('Error creating DM conversation:', error);
      });
  }, [activeContact?.id, isActiveUserChat, dmConversationIdByUserId]);

  // Get active DM conversation ID
  const activeDmConversationId = isActiveUserChat && activeContact?.id
    ? dmConversationIdByUserId[activeContact.id] ?? null
    : null;

  // Handle when a new conversation is created from the panel
  const handleDmConversationCreated = useCallback((conversationId: string) => {
    if (!activeContact?.id) return;
    setDmConversationIdByUserId((prev) => ({
      ...prev,
      [activeContact.id]: conversationId,
    }));
  }, [activeContact?.id]);

  // Handle user chat activity (for sorting in contact list)
  const handleUserChatActivity = useCallback((timestamp: number) => {
    if (!activeContact?.id || !isActiveUserChat) return;
    recordChatActivity(activeContact.id, timestamp);
  }, [activeContact?.id, isActiveUserChat, recordChatActivity]);

  // Handle DM last message change (for preview in contact list)
  const handleDmLastMessageChange = useCallback((preview: { text: string; timestamp: number } | null) => {
    if (!activeContact?.id || !isActiveUserChat) return;
    setDmPreviewByUserId((prev) => {
      if (!preview) {
        if (!(activeContact.id in prev)) return prev;
        const next = { ...prev };
        delete next[activeContact.id];
        return next;
      }
      const existing = prev[activeContact.id];
      if (existing?.text === preview.text && existing?.timestamp === preview.timestamp) return prev;
      return { ...prev, [activeContact.id]: preview };
    });
  }, [activeContact?.id, isActiveUserChat]);

  const handleNewChat = useCallback((chatId: string) => {
    setThreadsByChatId((prev) => {
      return {
        ...prev,
        [chatId]: {
          chatId,
          messages: [],
        },
      };
    });

    setClearedChats((prev) => {
      if (prev.has(chatId)) return prev;
      const next = new Set(prev);
      next.add(chatId);
      return next;
    });

    // Clearing the thread means there is nothing to be "unread".
    setLastReadMessageIdByChatId((prev) => {
      if (!(chatId in prev)) return prev;
      const next = { ...prev };
      delete next[chatId];
      return next;
    });
    const threadId = UUID_REGEX.test(chatId) ? dbThreadIdByChatId[chatId] : undefined;
    if (threadId) {
      void apiFetch(`/api/chat/threads/${threadId}/messages`, { method: 'DELETE' }).catch(() => {
        // no-op
      });
    }
  }, [dbThreadIdByChatId]);

  const handleToggleLike = useCallback((chatId: string) => {
    setStatsByChatId((prev) => {
      const current = prev[chatId] ?? buildDefaultStats(chatId);
      const nextIsLiked = !current.isLiked;
      const nextLikes = Math.max(0, current.likes + (nextIsLiked ? 1 : -1));
      return {
        ...prev,
        [chatId]: { ...current, isLiked: nextIsLiked, likes: nextLikes },
      };
    });
  }, []);

  const handleUpdateSettings = useCallback(
    (chatId: string, partial: Partial<ChatCharacterSettings>) => {
      setSettingsByChatId((prev) => {
        const current = prev[chatId] ?? buildDefaultSettings();
        const merged: ChatCharacterSettings = {
          ...current,
          ...partial,
          voice: {
            ...current.voice,
            ...(partial.voice ?? {}),
          },
        };

        return {
          ...prev,
          [chatId]: {
            temperature: clamp(merged.temperature, 0, 2),
            maxMessageLength: clamp(merged.maxMessageLength, 100, 5000),
            voice: {
              rate: clamp(merged.voice.rate, 0.5, 2),
              pitch: clamp(merged.voice.pitch, 0, 2),
            },
          },
        };
      });
    },
    []
  );

  return (
    <div className="chat-page">
      <div className={cn('chat-grid', resolvedActiveId && 'chat-grid-has-active')}>
        <ChatContactsPanel
          contacts={sortedContacts}
          activeChatId={resolvedActiveId}
          threadsByChatId={threadsByChatIdForList}
          lastReadMessageIdByChatId={lastReadMessageIdByChatId}
        />

        {activeContact && activeThread ? (
          isActiveUserChat ? (
            <ChatUserConversationPanel
              contact={activeContact}
              profileHref={`/user/${activeUserProfile?.handle ?? activeContact.id}`}
              loading={activeUserLoading}
              error={activeUserError}
              conversationId={activeDmConversationId}
              onConversationCreated={handleDmConversationCreated}
              onActivity={handleUserChatActivity}
              onLastMessageChange={handleDmLastMessageChange}
            />
          ) : (
            <ChatConversationPanel
              contact={activeContact}
              thread={activeThread}
              voiceSettings={activeSettings?.voice}
              isTyping={typingByChatId[activeContact.id] ?? false}
              onSendText={(text) => handleSendText(activeContact.id, text)}
              onSendImage={(prompt, style) => handleSendImage(activeContact.id, prompt, style)}
              onSendMedia={(items) => handleSendMedia(activeContact.id, items)}
              onSendVideo={(type, file, prompt) => handleSendVideo(activeContact.id, type, file, prompt)}
              onSendAIEdit={(file, prompt) => handleSendAIEdit(activeContact.id, file, prompt)}
              onAskGenerate={(label) => handleAskGenerate(activeContact.id, label)}
              onAskVideo={(label) => handleAskVideo(activeContact.id, label)}
            />
          )
        ) : (
          <section className="chat-panel chat-panel-center" aria-label="Conversation">
            <div className="chat-panel-empty">
              <p className="chat-panel-title">Select a chat to start</p>
              <p className="chat-panel-subtitle">Your messages will appear here.</p>
            </div>
          </section>
        )}

        {activeContact ? (
          isActiveUserChat ? (
            <ChatUserDetailsPanel
              userId={activeContact.id}
              contactName={activeContact.name}
              contactAvatarUrl={activeContact.avatarUrl}
            />
          ) : activeStats && activeSettings && activeProfile ? (
            <ChatContactDetailsPanel
              key={activeContact.id}
              contact={activeContact}
              profile={activeProfile}
              stats={activeStats}
              settings={activeSettings}
              avatarUrls={activeCharacterData?.character?.avatarUrls}
              myGenerations={myGenerationsByChatId[activeContact.id] ?? []}
              onToggleLike={() => handleToggleLike(activeContact.id)}
              onNewChat={() => handleNewChat(activeContact.id)}
              onUpdateSettings={(partial) => handleUpdateSettings(activeContact.id, partial)}
            />
          ) : (
            <aside className="chat-panel chat-panel-right" aria-label="Profile">
              <div className="chat-panel-empty">
                <p className="chat-panel-title">Contact details</p>
                <p className="chat-panel-subtitle">Media and profile info will live here.</p>
              </div>
            </aside>
          )
        ) : (
          <aside className="chat-panel chat-panel-right" aria-label="Profile">
            <div className="chat-panel-empty">
              <p className="chat-panel-title">Contact details</p>
              <p className="chat-panel-subtitle">Media and profile info will live here.</p>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
