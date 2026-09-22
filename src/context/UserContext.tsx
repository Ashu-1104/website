'use client';

import React, { createContext, useContext, useCallback, useEffect, useState, useMemo, ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';

// Types matching the database schema
export type AvatarDecoration = 'none' | 'pink-glow' | 'purple-glow' | 'gold-frame';
export type ProfileVisibility = 'public' | 'private' | 'friends-only';

export interface UserProfile {
  id: string;
  handle: string | null;
  createdAt?: string;
  // Account
  email: string | null;
  phone: string | null;
  // Profile
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  avatarDecoration: AvatarDecoration;
  avatarDecorationUrl: string | null;
  // Privacy
  profileVisibility: ProfileVisibility;
  favoritesPublic: boolean;
  isDeactivated: boolean;
  blockedHandles: string[];
  // Preferences
  enableNsfwContent: boolean;
  // Notifications
  notifications: {
    email: {
      messages: boolean;
      follows: boolean;
      product: boolean;
    };
    push: {
      messages: boolean;
      follows: boolean;
      product: boolean;
    };
  };
  // Connections
  connections: {
    discord: string;
    x: string;
    reddit: string;
    instagram: string;
    website: string;
  };
  // Stats
  followersCount: number;
  followingCount: number;
}

export interface UserContextValue {
  // User identity (always available, stored in localStorage for persistence)
  userId: string;
  handle: string;
  // Full profile data (fetched from database)
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  // Headers for API requests
  headers: Record<string, string>;
  // Actions
  updateHandle: (newHandle: string) => Promise<boolean>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
  // Avatar decoration helper
  avatarDecorationClassName: string;
}

const USER_ID_KEY = 'vp:user:id';
const USER_HANDLE_KEY = 'vp:user:handle';

const defaultNotifications = {
  email: { messages: true, follows: true, product: false },
  push: { messages: true, follows: false, product: false },
};

const defaultConnections = {
  discord: '',
  x: '',
  reddit: '',
  instagram: '',
  website: '',
};

const defaultProfile: UserProfile = {
  id: '',
  handle: null,
  email: null,
  phone: null,
  avatarUrl: null,
  bannerUrl: null,
  bio: null,
  avatarDecoration: 'none',
  avatarDecorationUrl: null,
  profileVisibility: 'public',
  favoritesPublic: true,
  isDeactivated: false,
  blockedHandles: [],
  enableNsfwContent: true,
  notifications: defaultNotifications,
  connections: defaultConnections,
  followersCount: 0,
  followingCount: 0,
};

const UserContext = createContext<UserContextValue | null>(null);

function generateUuidV4Fallback() {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function getOrCreateUserId(): string {
  if (typeof window === 'undefined') return '';
  const existing = window.localStorage.getItem(USER_ID_KEY);
  if (existing && existing.length > 0) return existing;

  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : generateUuidV4Fallback();
  window.localStorage.setItem(USER_ID_KEY, id);
  return id;
}

function getStoredHandle(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(USER_HANDLE_KEY)?.trim() ?? '';
}

function setStoredHandle(handle: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(USER_HANDLE_KEY, handle);
}

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const { user: authUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const [userId, setUserId] = useState<string>('');
  const [handle, setHandle] = useState<string>('');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync with authenticated user when available, otherwise fall back to localStorage
  useEffect(() => {
    if (authLoading) return;

    if (isAuthenticated && authUser) {
      // Use the authenticated user's ID and handle
      setUserId(authUser.id);
      setHandle(authUser.handle || `user_${authUser.id.slice(0, 6)}`);
      // Also update localStorage so other parts of the app stay in sync
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(USER_ID_KEY, authUser.id);
        if (authUser.handle) {
          window.localStorage.setItem(USER_HANDLE_KEY, authUser.handle);
        }
      }
    } else {
      // No auth - fall back to anonymous localStorage identity
      const id = getOrCreateUserId();
      const storedHandle = getStoredHandle();
      setUserId(id);
      if (storedHandle) {
        setHandle(storedHandle);
      } else {
        const defaultHandle = `user_${id.slice(0, 6)}`;
        setHandle(defaultHandle);
        setStoredHandle(defaultHandle);
      }
    }
  }, [authLoading, isAuthenticated, authUser]);

  // Headers for API requests
  const headers = useMemo((): Record<string, string> => {
    if (!userId) return {} as Record<string, string>;
    return {
      'x-vp-user-id': userId,
      'x-vp-user-handle': handle,
      'Content-Type': 'application/json',
    };
  }, [userId, handle]);

  // Fetch profile from database
  const refreshProfile = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      // First, ensure user exists in database (POST creates if not exists)
      const initResponse = await fetch('/api/user', {
        method: 'POST',
        headers: {
          'x-vp-user-id': userId,
          'x-vp-user-handle': handle,
        },
      });

      if (!initResponse.ok) {
        throw new Error('Failed to initialize user');
      }

      // Then fetch full profile
      const response = await fetch('/api/user', {
        method: 'GET',
        headers: {
          'x-vp-user-id': userId,
          'x-vp-user-handle': handle,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      setProfile({
        ...defaultProfile,
        ...data,
        notifications: data.notifications ?? defaultNotifications,
        connections: data.connections ?? defaultConnections,
      });

      // Update local handle if different from server
      if (data.handle && data.handle !== handle) {
        setHandle(data.handle);
        setStoredHandle(data.handle);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [userId, handle]);

  // Fetch profile on mount
  useEffect(() => {
    if (userId) {
      refreshProfile();
    }
  }, [userId, refreshProfile]);

  // Update handle
  const updateHandle = useCallback(
    async (newHandle: string): Promise<boolean> => {
      const trimmed = newHandle.trim();
      if (!trimmed || !userId) return false;

      try {
        const response = await fetch('/api/user', {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ handle: trimmed }),
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error ?? 'Failed to update handle');
          return false;
        }

        setHandle(trimmed);
        setStoredHandle(trimmed);
        await refreshProfile();
        return true;
      } catch (err) {
        console.error('Error updating handle:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        return false;
      }
    },
    [userId, headers, refreshProfile]
  );

  // Update profile
  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>): Promise<boolean> => {
      if (!userId) return false;

      try {
        const response = await fetch('/api/user', {
          method: 'PATCH',
          headers,
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error ?? 'Failed to update profile');
          return false;
        }

        await refreshProfile();
        return true;
      } catch (err) {
        console.error('Error updating profile:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        return false;
      }
    },
    [userId, headers, refreshProfile]
  );

  // Avatar decoration class helper
  const avatarDecorationClassName = useMemo(() => {
    const decoration = profile?.avatarDecoration ?? 'none';
    switch (decoration) {
      case 'pink-glow':
        return 'shadow-glow';
      case 'purple-glow':
        return 'shadow-[0_0_20px_rgba(155,89,182,0.35)]';
      case 'gold-frame':
        return 'ring-2 ring-yellow-400/70';
      default:
        return '';
    }
  }, [profile?.avatarDecoration]);

  const value: UserContextValue = useMemo(
    () => ({
      userId,
      handle,
      profile,
      isLoading,
      error,
      headers,
      updateHandle,
      updateProfile,
      refreshProfile,
      avatarDecorationClassName,
    }),
    [userId, handle, profile, isLoading, error, headers, updateHandle, updateProfile, refreshProfile, avatarDecorationClassName]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

// Backward compatibility hooks - these can be used to gradually migrate existing code

// Replaces useLocalUser
export function useUserIdentity() {
  const { userId, handle, headers, updateHandle } = useUser();
  return { userId, handle, headers, setHandle: updateHandle };
}

// Replaces useLocalProfileSettings
export function useProfileSettings() {
  const { profile, updateProfile, avatarDecorationClassName } = useUser();

  const profileData = useMemo(
    () => ({
      // Legacy fields (deprecated but kept for backward compatibility)
      avatarDataUrl: profile?.avatarUrl ?? undefined,
      bannerDataUrl: profile?.bannerUrl ?? undefined,
      avatarDecorationUrl: profile?.avatarDecorationUrl ?? undefined,
      // New fields
      avatarUrl: profile?.avatarUrl ?? undefined,
      bannerUrl: profile?.bannerUrl ?? undefined,
      avatarDecoration: profile?.avatarDecoration ?? 'none',
      bio: profile?.bio ?? '',
    }),
    [profile]
  );

  // Accept both old and new field names for backward compatibility
  const updateProfileData = useCallback(
    async (patch: {
      avatarUrl?: string;
      avatarDataUrl?: string; // Legacy - maps to avatarUrl
      bannerUrl?: string;
      bannerDataUrl?: string; // Legacy - maps to bannerUrl
      avatarDecorationUrl?: string;
      avatarDecoration?: AvatarDecoration;
      bio?: string;
    }) => {
      // Map legacy field names to new ones
      const mappedPatch: Partial<UserProfile> = {};

      // Avatar: prefer new field, fallback to legacy
      if (patch.avatarUrl !== undefined) {
        mappedPatch.avatarUrl = patch.avatarUrl || null;
      } else if (patch.avatarDataUrl !== undefined) {
        mappedPatch.avatarUrl = patch.avatarDataUrl || null;
      }

      // Banner: prefer new field, fallback to legacy
      if (patch.bannerUrl !== undefined) {
        mappedPatch.bannerUrl = patch.bannerUrl || null;
      } else if (patch.bannerDataUrl !== undefined) {
        mappedPatch.bannerUrl = patch.bannerDataUrl || null;
      }

      if (patch.avatarDecoration !== undefined) {
        mappedPatch.avatarDecoration = patch.avatarDecoration;
      }

      if (patch.avatarDecorationUrl !== undefined) {
        mappedPatch.avatarDecorationUrl = patch.avatarDecorationUrl || null;
      }

      if (patch.bio !== undefined) {
        mappedPatch.bio = patch.bio || null;
      }

      if (Object.keys(mappedPatch).length > 0) {
        await updateProfile(mappedPatch);
      }
    },
    [updateProfile]
  );

  const resetProfile = useCallback(async () => {
    await updateProfile({
      avatarUrl: null,
      bannerUrl: null,
      avatarDecoration: 'none',
      avatarDecorationUrl: null,
      bio: null,
    });
  }, [updateProfile]);

  return {
    profile: profileData,
    updateProfile: updateProfileData,
    resetProfile,
    avatarDecorationClassName,
  };
}

// Replaces useLocalAppSettings
export function useAppSettings() {
  const { profile, updateProfile } = useUser();

  const settings = useMemo(
    () => ({
      account: {
        email: profile?.email ?? '',
        phone: profile?.phone ?? '',
      },
      privacy: {
        visibility: profile?.profileVisibility ?? 'public',
        favoritesPublic: profile?.favoritesPublic ?? true,
        blockedHandles: profile?.blockedHandles ?? [],
      },
      notifications: profile?.notifications ?? defaultNotifications,
      connections: profile?.connections ?? defaultConnections,
      accountState: {
        deactivated: profile?.isDeactivated ?? false,
      },
    }),
    [profile]
  );

  const updateSettings = useCallback(
    async (
      updater: (
        prev: typeof settings
      ) => Partial<{
        account: { email?: string; phone?: string };
        privacy: { visibility?: ProfileVisibility; favoritesPublic?: boolean };
        notifications: typeof defaultNotifications;
        connections: typeof defaultConnections;
        accountState: { deactivated?: boolean };
      }>
    ) => {
      const updates = updater(settings);
      const profileUpdates: Partial<UserProfile> = {};

      if (updates.account?.email !== undefined) {
        profileUpdates.email = updates.account.email || null;
      }
      if (updates.account?.phone !== undefined) {
        profileUpdates.phone = updates.account.phone || null;
      }
      if (updates.privacy?.visibility !== undefined) {
        profileUpdates.profileVisibility = updates.privacy.visibility;
      }
      if (updates.privacy?.favoritesPublic !== undefined) {
        profileUpdates.favoritesPublic = updates.privacy.favoritesPublic;
      }
      if (updates.notifications) {
        profileUpdates.notifications = updates.notifications;
      }
      if (updates.connections) {
        profileUpdates.connections = updates.connections;
      }
      if (updates.accountState?.deactivated !== undefined) {
        profileUpdates.isDeactivated = updates.accountState.deactivated;
      }

      await updateProfile(profileUpdates);
    },
    [settings, updateProfile]
  );

  const resetSettings = useCallback(async () => {
    await updateProfile({
      email: null,
      phone: null,
      profileVisibility: 'public',
      favoritesPublic: true,
      isDeactivated: false,
      notifications: defaultNotifications,
      connections: defaultConnections,
    });
  }, [updateProfile]);

  return { settings, updateSettings, resetSettings };
}
