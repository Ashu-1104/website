'use client';

// Re-export types and hooks from the centralized user context for backward compatibility
// Profile data is now backed by database storage instead of localStorage
export type { AvatarDecoration } from '@/context/UserContext';

export type LocalProfileSettings = {
  avatarDataUrl?: string;
  avatarUrl?: string;
  bannerDataUrl?: string;
  bannerUrl?: string;
  avatarDecorationUrl?: string;
  avatarDecoration: 'none' | 'pink-glow' | 'purple-glow' | 'gold-frame';
  bio: string;
};

// Legacy functions - deprecated, now no-ops
export function loadLocalProfileSettings(): LocalProfileSettings {
  return { avatarDecoration: 'none', bio: '' };
}

export function clearLocalProfileSettings() {
  // No-op - data is now in database
}

// Re-export the hook with the original name
export { useProfileSettings as useLocalProfileSettings } from '@/context/UserContext';
