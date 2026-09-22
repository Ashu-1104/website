'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';

export interface AuthUser {
  id: string;
  email: string | null;
  handle: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  role: string;
  isAdmin: boolean;
  emailVerified: string | null;
  profileVisibility: string;
  createdAt: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  needsPersonalization: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, handle?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setNickname: (nickname: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Track whether user is logged in via ref to avoid interval deps on user object
  const isLoggedInRef = useRef(false);
  isLoggedInRef.current = !!user;

  // Fetch current user on mount (runs once, no dedup needed)
  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('[Auth] Failed to fetch user:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Cross-tab token refresh with lock to prevent refresh storms (#96)
  useEffect(() => {
    const LOCK_KEY = 'vp.auth.refreshLock';
    const LOCK_TTL = 15_000; // 15 seconds max lock duration
    const REFRESH_INTERVAL = 14 * 60 * 1000; // 14 minutes
    const BROADCAST_CHANNEL_NAME = 'vp-auth-refresh';

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    } catch {
      // BroadcastChannel not available (e.g., SSR or older browsers)
    }

    // Listen for refresh events from other tabs
    if (channel) {
      channel.onmessage = (event) => {
        if (event.data?.type === 'TOKEN_REFRESHED') {
          // Another tab successfully refreshed; re-fetch user to pick up new cookie
          if (isLoggedInRef.current) {
            fetchUser();
          }
        } else if (event.data?.type === 'TOKEN_REFRESH_FAILED') {
          // Another tab's refresh failed; log out
          setUser(null);
        }
      };
    }

    /**
     * Acquire a localStorage-based lock.
     * Returns true if the lock was acquired, false if another tab holds it.
     */
    function acquireLock(): boolean {
      const existing = localStorage.getItem(LOCK_KEY);
      if (existing) {
        const ts = parseInt(existing, 10);
        if (Date.now() - ts < LOCK_TTL) {
          // Lock is still valid — another tab is refreshing
          return false;
        }
        // Stale lock — take over
      }
      localStorage.setItem(LOCK_KEY, String(Date.now()));
      return true;
    }

    function releaseLock(): void {
      localStorage.removeItem(LOCK_KEY);
    }

    async function refreshWithLock(): Promise<void> {
      if (!isLoggedInRef.current) return;

      if (!acquireLock()) {
        // Another tab is already refreshing; skip
        return;
      }

      try {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });

        if (response.ok) {
          // Notify other tabs of successful refresh
          channel?.postMessage({ type: 'TOKEN_REFRESHED' });
        } else {
          setUser(null);
          channel?.postMessage({ type: 'TOKEN_REFRESH_FAILED' });
        }
      } catch (error) {
        console.error('[Auth] Token refresh failed:', error);
      } finally {
        releaseLock();
      }
    }

    const refreshInterval = setInterval(refreshWithLock, REFRESH_INTERVAL);

    return () => {
      clearInterval(refreshInterval);
      if (channel) {
        channel.close();
      }
    };
  }, [fetchUser]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      console.error('[Auth] Login error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }, []);

  const register = useCallback(async (email: string, password: string, handle?: string) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, handle }),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Registration failed' };
      }
    } catch (error) {
      console.error('[Auth] Registration error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('[Auth] Logout error:', error);
    } finally {
      if (typeof window !== 'undefined') {
        for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
          const key = window.localStorage.key(i);
          if (key && key.startsWith('vp.chat.')) {
            window.localStorage.removeItem(key);
          }
        }
      }
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  const setNickname = useCallback(async (nickname: string) => {
    try {
      const response = await fetch('/api/auth/set-nickname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ nickname }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update local user state with new handle
        setUser((prev) => (prev ? { ...prev, handle: nickname } : null));
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Failed to set nickname' };
      }
    } catch (error) {
      console.error('[Auth] Set nickname error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }, []);

  // User needs personalization if they're authenticated but have no handle
  const needsPersonalization = !!user && !user.handle;

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      needsPersonalization,
      login,
      register,
      logout,
      refreshUser,
      setNickname,
    }),
    [user, isLoading, needsPersonalization, login, register, logout, refreshUser, setNickname]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
