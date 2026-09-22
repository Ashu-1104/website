import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { SidebarProvider } from '@/context/SidebarContext';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

// "ai girlfriend generator" = 4,400/mo, KD 35%
// "ai girlfriend love simulator" = 1,600/mo, KD 22%
// "dream companion ai"           = 1,300/mo, KD 5% — easiest keyword
export const metadata: Metadata = {
  title: 'AI Girlfriend Generator — Create Your Perfect AI Girlfriend Free | Veloura.ai',
  description:
    'Generate your perfect AI girlfriend with our free AI girlfriend creator. Choose her appearance, personality, voice, and interests. Start chatting instantly — no filters, no restrictions.',
  keywords: [
    'ai girlfriend generator',      // 4,400/mo, KD 35%
    'ai girlfriend love simulator', // 1,600/mo, KD 22%
    'dream companion ai',           // 1,300/mo, KD 5% — easiest keyword
    'create ai girlfriend',
    'ai girlfriend creator',
    'free ai girlfriend generator',
    'generate ai girlfriend',
    'custom ai girlfriend generator',
    'ai girlfriend maker',
    'ai girlfriend builder',
    'make your own ai girlfriend',
    'ai girlfriend design',
    'nsfw ai girlfriend generator',
    'free ai girlfriend creator',
    'ai girlfriend app generator',
    'yandere ai girlfriend simulator', // 1,900/mo, KD 29%
  ],
  alternates: { canonical: `${APP_URL}/ai-girlfriend-generator` },
  openGraph: {
    title: 'AI Girlfriend Generator — Create Your Perfect AI Girlfriend Free | Veloura.ai',
    description:
      'Generate your perfect AI girlfriend free. Choose appearance, personality, voice, and interests. Chat instantly — no filters, no restrictions.',
    url: `${APP_URL}/ai-girlfriend-generator`,
    siteName: 'Veloura.ai',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Girlfriend Generator — Free AI Girlfriend Creator | Veloura.ai',
    description:
      'Generate your perfect AI girlfriend free. Design appearance, personality, and voice. No restrictions.',
  },
};

export default function AIGirlfriendGeneratorLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="app-layout">
        <Sidebar />
        <Header />
        <main className="main-content">{children}</main>
      </div>
    </SidebarProvider>
  );
}
