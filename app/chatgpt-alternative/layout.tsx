import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { SidebarProvider } from '@/context/SidebarContext';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

export const metadata: Metadata = {
  title: 'Best ChatGPT Alternative — Free, Uncensored, No Content Filters (2026) | Veloura.ai',
  description:
    'The best ChatGPT alternative for uncensored AI. Generate NSFW images, chat without filters, create AI videos — everything ChatGPT blocks, we allow. Free to start, no restrictions.',
  keywords: [
    'chatgpt alternative',           // 27,100/mo, KD 29%
    'chatgpt alternatives',          // 8,100/mo, KD 41%
    'alternatives to chatgpt',       // 3,600/mo, KD 31%
    'alternative to chatgpt',        // 2,400/mo, KD 42%
    'chatgpt alternative free',      // 2,400/mo, KD 58%
    'chatgpt alternatives free',     // 1,900/mo, KD 40%
    'best chatgpt alternatives',     // 1,600/mo, KD 37%
    'free chatgpt alternatives',     // 1,600/mo, KD 42%
    'free chatgpt alternative',      // 1,300/mo, KD 53%
    'best chatgpt alternative',      // 880/mo, KD 48%
    'chatgpt free alternative',          // 720/mo, KD 62
    'uncensored chatgpt alternative',
    'nsfw chatgpt alternative',
    'chatgpt alternative no filter',
    'chatgpt alternative nsfw',
  ],
  alternates: { canonical: `${APP_URL}/chatgpt-alternative` },
  openGraph: {
    title: 'Best ChatGPT Alternative — Free, Uncensored, No Restrictions',
    description:
      'The best free ChatGPT alternative. NSFW image generation, uncensored AI chat, videos — everything ChatGPT blocks, we support. No filters, no sign-up required.',
    url: `${APP_URL}/chatgpt-alternative`,
    siteName: 'Veloura.ai',
    type: 'website',
    images: [
      {
        url: 'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/og-images/og-chatgpt-alternative.png',
        width: 1200,
        height: 630,
        alt: 'Everything ChatGPT Blocks. We Allow. — Veloura.ai',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Best ChatGPT Alternative — Uncensored, Free, No Filters',
    description:
      'NSFW images, uncensored chat, AI videos — the ChatGPT alternative for adult content. Free to start.',
    images: ['https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/og-images/og-chatgpt-alternative.png'],
  },
};

export default function ChatGPTAlternativeLayout({ children }: { children: ReactNode }) {
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
