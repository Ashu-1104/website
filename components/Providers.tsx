'use client';

import { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { AuthProvider } from '@/context/AuthContext';
import { AuthModalProvider } from '@/context/AuthModalContext';
import { UserProvider } from '@/context/UserContext';
import AuthModal from '@/components/auth/AuthModal';
import PersonalizationModal from '@/components/auth/PersonalizationModal';

// Lazy-load the SocketProvider so socket.io-client (~60-80KB) stays out
// of the initial page bundle. IMPORTANT: do NOT pass { ssr: false } here —
// the SocketContext's connection lives inside useEffect and is already
// SSR-safe. Setting ssr:false forces every page under Providers to emit
// BAILOUT_TO_CLIENT_SIDE_RENDERING, which ships empty HTML to crawlers
// and wipes out SEO (no <h1>, no body content for Googlebot/GPTBot/etc.).
const LazySocketProvider = dynamic(
  () => import('@/context/SocketContext').then((mod) => mod.SocketProvider),
);

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <LazySocketProvider>
        <AuthModalProvider>
          <UserProvider>
            {children}
            <AuthModal />
            <PersonalizationModal />
          </UserProvider>
        </AuthModalProvider>
      </LazySocketProvider>
    </AuthProvider>
  );
}
