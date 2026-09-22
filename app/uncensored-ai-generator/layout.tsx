import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { SidebarProvider } from '@/context/SidebarContext';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

// "uncensored ai generator" = 8,100/mo, KD 22% — QUICK WIN
// "ai uncensored"           = 3,600/mo, KD 19%
// "uncensored ai"           = 22,200/mo, KD 44% — brand keyword
export const metadata: Metadata = {
  title: 'Uncensored AI Generator — Images, Video, Chat & Voice | Veloura.ai',
  description:
    'The most powerful uncensored AI generator platform. Generate uncensored AI images, videos, voice, and chat with no filters, no restrictions, no content blocks. Free to start.',
  keywords: [
    'uncensored ai generator',             // 8,100/mo, KD 22%
    'uncensored ai',                        // 22,200/mo, KD 44%
    'ai uncensored',                        // 3,600/mo, KD 19%
    'uncensored ai chat',                   // 5,400/mo, KD 40%
    'uncensored ai chatbot',                // 3,600/mo, KD 31%
    'uncensored ai image generator',        // 4,400/mo, KD 40%
    'uncensored ai video generator',        // 2,900/mo, KD 10%
    'uncensored ai image editor',           // 1,300/mo, KD 20%
    'free uncensored ai generator',         // 1,300/mo, KD 32%
    'uncensored ai generator free',         // 1,300/mo, KD 35%
    'free uncensored ai',                   // 1,000/mo, KD 34%
    'best uncensored ai',                   // 720/mo, KD 20%
    'free uncensored smart ai',             // 880/mo, KD 16%
    'uncensored ai text generator',         // 1,000/mo, KD 55%
    'chatgpt alternative',                  // 27,100/mo, KD 29%
    'nsfw ai generator',
    'ai no restrictions',
  ],
  alternates: { canonical: `${APP_URL}/uncensored-ai-generator` },
  openGraph: {
    title: 'Uncensored AI Generator — Images, Video, Chat & Voice | Veloura.ai',
    description:
      'The most powerful uncensored AI platform. Generate images, videos, voice, and chat with no filters, no restrictions. Free to start.',
    url: `${APP_URL}/uncensored-ai-generator`,
    siteName: 'Veloura.ai',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Uncensored AI Generator — Images, Video, Chat & Voice | Veloura.ai',
    description:
      'Generate uncensored AI images, videos, voice, and chat with zero restrictions. Free to start, no filters.',
  },
};

export default function UncensoredAIGeneratorLayout({ children }: { children: ReactNode }) {
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
