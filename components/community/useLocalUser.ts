'use client';

// Re-export from the centralized user context for backward compatibility
// This hook is now backed by database storage instead of localStorage
export { useUserIdentity as useLocalUser } from '@/context/UserContext';
