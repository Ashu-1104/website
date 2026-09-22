import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { SidebarProvider } from '@/context/SidebarContext';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

export const metadata: Metadata = {
  title: 'AI Girlfriend Chat — Chat with Your AI Girlfriend Free | Veloura.ai',
  description:
    'Chat with your AI girlfriend free. Uncensored, no filters, no restrictions. Create your perfect AI girlfriend and start chatting instantly — NSFW roleplay, voice, and image generation included.',
  keywords: [
    'nsfw ai chat',           // 22,200/mo (real Semrush) — $0 CPC, no paid competition
    'AI girlfriend chat', 'chat with AI girlfriend', 'AI girlfriend app',
    'uncensored AI chat',
    'AI chat no filter', 'talk to AI girlfriend', 'AI girlfriend free chat',
    'uncensored AI girlfriend chat', 'NSFW AI girlfriend chat',
    'free AI girlfriend chat', 'AI girlfriend no restrictions',
    'best AI girlfriend chat', 'realistic AI girlfriend chat',
    'character AI alternative', // 4,400/mo, KD 29% — high-intent comparison traffic
    'character AI NSFW alternative',
  ],
  alternates: { canonical: `${APP_URL}/ai-girlfriend-chat` },
  openGraph: {
    title: 'AI Girlfriend Chat — Chat with Your AI Girlfriend Free | Veloura.ai',
    description:
      'Chat with your AI girlfriend free. Uncensored, no filters. Create your perfect AI girlfriend and start chatting instantly — NSFW roleplay, voice & images included.',
    url: `${APP_URL}/ai-girlfriend-chat`,
    siteName: 'Veloura.ai',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Girlfriend Chat — Free, Uncensored, No Filter | Veloura.ai',
    description:
      'Chat with your AI girlfriend free. No filters, no restrictions. NSFW roleplay, voice & image generation included.',
  },
};

export default function AIGirlfriendChatLayout({ children }: { children: ReactNode }) {
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
