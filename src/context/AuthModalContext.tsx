'use client';

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

type AuthModalMode = 'login' | 'register' | null;

interface AuthModalContextType {
  mode: AuthModalMode;
  openLogin: () => void;
  openRegister: () => void;
  close: () => void;
  switchToLogin: () => void;
  switchToRegister: () => void;
}

const AuthModalContext = createContext<AuthModalContextType | null>(null);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AuthModalMode>(null);

  const openLogin = useCallback(() => setMode('login'), []);
  const openRegister = useCallback(() => setMode('register'), []);
  const close = useCallback(() => setMode(null), []);
  const switchToLogin = useCallback(() => setMode('login'), []);
  const switchToRegister = useCallback(() => setMode('register'), []);

  const value = useMemo(
    () => ({
      mode,
      openLogin,
      openRegister,
      close,
      switchToLogin,
      switchToRegister,
    }),
    [mode, openLogin, openRegister, close, switchToLogin, switchToRegister]
  );

  return (
    <AuthModalContext.Provider value={value}>
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error('useAuthModal must be used within an AuthModalProvider');
  }
  return context;
}
