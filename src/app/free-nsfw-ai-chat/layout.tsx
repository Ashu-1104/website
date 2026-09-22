import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { SidebarProvider } from '@/context/SidebarContext';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

// "free nsfw ai chat" = 9,900/mo, KD 21% — TOP QUICK WIN (#2 in full report)
// "nsfw ai chat bot"  = 5,400/mo, KD 27%
// "best nsfw ai chat" = 4,400/mo, KD 22%
export const metadata: Metadata = {
  title: 'Free NSFW AI Chat — Uncensored, No Sign Up Required | Veloura.ai',
  description:
    'Free NSFW AI chat with no filters, no sign-up required, no restrictions. Chat with your AI girlfriend or custom AI companion — explicit content fully supported. Start free now.',
  keywords: [
    'free nsfw ai chat',               // 9,900/mo, KD 21%
    'nsfw ai chat bot',                // 5,400/mo, KD 27%
    'uncensored ai chat',              // 5,400/mo, KD 40%
    'best nsfw ai chat',               // 4,400/mo, KD 22%
    'free uncensored ai chat',         // 480/mo, KD 26%
    'ai chat no restrictions',         // 390/mo, KD 18% — EASY WIN
    'uncensored ai chat bot',          // 590/mo, KD 28%
    'uncensored ai chats',             // 590/mo, KD 42%
    'uncensored chat ai',              // 390/mo, KD 19%
    'ai chat uncensored',              // 590/mo, KD 39%
    'chat ai uncensored',              // 140/mo, KD 19%
    'chat uncensored ai',              // 170/mo, KD 39%
    'uncensored ai character chat',    // 110/mo, KD 25%
    'best uncensored ai chat',         // 110/mo, KD 20%
    'free ai chat uncensored',         // 110/mo, KD 27%
    'ai chat with no restrictions',    // 720/mo, KD 50%
    'ai chat bot with no restrictions',// 170/mo, KD 43%
    'free ai chats with no restrictions', // 140/mo, KD 63%
    'free nsfw ai chat no sign up',
    'nsfw ai chat free',
    'uncensored ai chat free',
    'nsfw ai girlfriend chat free',
    'free ai chat no restrictions',
    'nsfw chatbot free',
  ],
  alternates: { canonical: `${APP_URL}/free-nsfw-ai-chat` },
  openGraph: {
    title: 'Free NSFW AI Chat — No Sign Up, No Restrictions | Veloura.ai',
    description:
      'Free NSFW AI chat with zero filters. Chat with your AI girlfriend — explicit content, roleplay, voice included. No sign-up credit card needed.',
    url: `${APP_URL}/free-nsfw-ai-chat`,
    siteName: 'Veloura.ai',
    type: 'website',
    images: [
      {
        url: 'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/og-images/og-free-nsfw-ai-chat.png',
        width: 1200,
        height: 630,
        alt: 'Free NSFW AI Chat — No Sign Up | Veloura.ai',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free NSFW AI Chat — No Sign Up, No Restrictions | Veloura.ai',
    description:
      'Free NSFW AI chat with zero filters. Chat with your AI girlfriend — explicit content, roleplay, voice. No credit card needed.',
    images: ['https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/og-images/og-free-nsfw-ai-chat.png'],
  },
};

export default function FreeNSFWAIChatLayout({ children }: { children: ReactNode }) {
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
