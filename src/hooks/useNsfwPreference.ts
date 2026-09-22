'use client';

import { useCallback, useState } from 'react';
import { useUser } from '@/context/UserContext';
import { useAuth } from '@/context/AuthContext';

/**
 * Hook that provides NSFW preference synced to the database for logged-in users,
 * with a local-state fallback for anonymous visitors.
 */
export function useNsfwPreference() {
  const { isAuthenticated } = useAuth();
  const { profile, updateProfile } = useUser();

  // Fallback state for anonymous users
  const [localNsfw, setLocalNsfw] = useState(true);

  const enableNsfw = isAuthenticated && profile
    ? profile.enableNsfwContent
    : localNsfw;

  const setEnableNsfw = useCallback(
    async (value: boolean) => {
      if (isAuthenticated) {
        await updateProfile({ enableNsfwContent: value });
      } else {
        setLocalNsfw(value);
      }
    },
    [isAuthenticated, updateProfile]
  );

  return { enableNsfw, setEnableNsfw } as const;
}
