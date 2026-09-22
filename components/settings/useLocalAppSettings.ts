'use client';

// Re-export types and hooks from the centralized user context for backward compatibility
// Settings data is now backed by database storage instead of localStorage
export type { ProfileVisibility } from '@/context/UserContext';

export type LocalAppSettings = {
  account: {
    email: string;
    phone: string;
  };
  privacy: {
    visibility: 'public' | 'private' | 'friends-only';
    favoritesPublic: boolean;
    blockedHandles: string[];
  };
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
  connections: {
    discord: string;
    x: string;
    reddit: string;
    instagram: string;
    website: string;
  };
  accountState: {
    deactivated: boolean;
  };
};

// Legacy function - deprecated, now no-op
export function clearLocalSettings() {
  // No-op - data is now in database
}

// Re-export the hook with the original name
export { useAppSettings as useLocalAppSettings } from '@/context/UserContext';
