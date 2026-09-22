import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { SidebarProvider } from '@/context/SidebarContext';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

// "uncensored ai video generator" = 2,900/mo, KD 10% — ULTRA QUICK WIN
// "ai generated porn video"       = 5,400/mo, KD 25%
// "ai generated porn videos"      = 5,400/mo, KD 24%
export const metadata: Metadata = {
  title: 'Uncensored AI Video Generator — No Restrictions, Free | Veloura.ai',
  description:
    'Generate uncensored AI videos online free. Create NSFW deepfake videos, AI kissing videos, motion transfer animations — no content restrictions. Instant results, no sign-up credit card.',
  keywords: [
    'uncensored ai video generator',           // 2,900/mo, KD 10% — ULTRA QUICK WIN
    'ai video generator no restrictions',      // 1,600/mo, KD 29%
    'ai video generator no restrictions free', // 1,300/mo, KD 54%
    'free ai video generator no restrictions', // 480/mo, KD 39%
    'ai video generator free no restrictions', // 390/mo, KD 47%
    'ai video generator with no restrictions', // 210/mo, KD 35%
    'ai image to video generator no restrictions', // 210/mo, KD 14% — EASY WIN
    'ai generated porn video',                 // 5,400/mo, KD 25%
    'ai generated porn videos',               // 5,400/mo, KD 24%
    'nsfw ai video generator',
    'uncensored video generator',
    'free uncensored ai video',
    'ai porn video generator',
    'uncensored ai video',
    'ai deepfake video no restrictions',
    'nsfw deepfake video generator',
    'ai video no filter',
    'uncensored deepfake generator',
    'ai girlfriend video generator',
  ],
  alternates: { canonical: `${APP_URL}/uncensored-ai-video-generator` },
  openGraph: {
    title: 'Uncensored AI Video Generator — No Restrictions, Free | Veloura.ai',
    description:
      'Generate uncensored AI videos free — deepfakes, kissing videos, motion transfer, NSFW content. No restrictions, no watermark.',
    url: `${APP_URL}/uncensored-ai-video-generator`,
    siteName: 'Veloura.ai',
    type: 'website',
    images: [
      {
        url: 'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/og-images/og-uncensored-ai-video-generator.png',
        width: 1200,
        height: 630,
        alt: 'Uncensored AI Video Generator — Veloura.ai',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Uncensored AI Video Generator — Free, No Restrictions | Veloura.ai',
    description:
      'Generate uncensored AI videos free. Deepfakes, kissing videos, motion transfer — no content restrictions.',
    images: ['https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/og-images/og-uncensored-ai-video-generator.png'],
  },
};

export default function UncensoredAIVideoLayout({ children }: { children: ReactNode }) {
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
