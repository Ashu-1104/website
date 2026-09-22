'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSocket } from './useSocket';
import type { PresenceData } from '@/types/dm';

type PresenceStatus = 'ONLINE' | 'AWAY' | 'OFFLINE';

interface PresenceMap {
  [userId: string]: {
    status: PresenceStatus;
    lastSeenAt: string;
  };
}

interface GetPresenceCallback {
  presences?: PresenceMap;
  error?: string;
}

interface UsePresenceReturn {
  presences: PresenceMap;
  getPresence: (userId: string) => { status: PresenceStatus; lastSeenAt: string | null };
  isOnline: (userId: string) => boolean;
}

export function usePresence(userIds: string[]): UsePresenceReturn {
  const { emit, on, isConnected, connectCount } = useSocket();
  const [presences, setPresences] = useState<PresenceMap>({});

  const stableUserIds = useMemo(() => [...userIds].sort(), [userIds]);

  // Subscribe to presence updates and get initial presence
  useEffect(() => {
    if (!isConnected || stableUserIds.length === 0) return;

    // Subscribe to presence updates for these users
    emit('presence:subscribe', stableUserIds);

    // Get initial presence data
    emit('presence:get', stableUserIds, (response: GetPresenceCallback) => {
      if (response.presences) {
        setPresences((prev) => ({ ...prev, ...response.presences }));
      }
    });

    // Unsubscribe on cleanup
    return () => {
      emit('presence:unsubscribe', stableUserIds);
    };
  }, [isConnected, connectCount, stableUserIds, emit]);

  // Listen for presence updates
  useEffect(() => {
    if (!isConnected) return;

    const handler = (...args: unknown[]) => {
      const data = args[0] as PresenceData;
      setPresences((prev) => ({
        ...prev,
        [data.userId]: { status: data.status, lastSeenAt: data.lastSeenAt },
      }));
    };

    const unsubscribe = on('presence:update', handler);

    return () => {
      unsubscribe();
    };
  }, [isConnected, connectCount, on]);

  // Get presence for a specific user
  const getPresence = useCallback(
    (userId: string): { status: PresenceStatus; lastSeenAt: string | null } => {
      const presence = presences[userId];
      return presence || { status: 'OFFLINE', lastSeenAt: null };
    },
    [presences]
  );

  // Check if a user is online
  const isOnline = useCallback(
    (userId: string): boolean => {
      const presence = presences[userId];
      return presence?.status === 'ONLINE';
    },
    [presences]
  );

  return { presences, getPresence, isOnline };
}

// Hook for watching a single user's presence
export function useUserPresence(userId: string | null): {
  status: PresenceStatus;
  lastSeenAt: string | null;
  isOnline: boolean;
} {
  const userIds = useMemo(() => (userId ? [userId] : []), [userId]);
  const { getPresence, isOnline } = usePresence(userIds);

  if (!userId) {
    return { status: 'OFFLINE', lastSeenAt: null, isOnline: false };
  }

  const presence = getPresence(userId);
  return {
    status: presence.status,
    lastSeenAt: presence.lastSeenAt,
    isOnline: isOnline(userId),
  };
}
