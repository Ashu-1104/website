import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { SidebarProvider } from '@/context/SidebarContext';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

export const metadata: Metadata = {
  title: 'AI Roleplay — Uncensored AI Roleplay Chat Free | Veloura.ai',
  description:
    'Explore uncensored AI roleplay with no restrictions. Fantasy, romance, NSFW scenarios, adventure — chat and roleplay with custom AI characters. Free, no content filters.',
  keywords: [
    'AI roleplay',            // 9,900/mo (real Semrush), KD 85%
    'nsfw ai chat',           // 22,200/mo — related high-volume keyword
    'character AI alternative', // 4,400/mo, KD 29% — high-intent comparison traffic
    'character AI NSFW alternative', 'uncensored character AI',
    'AI roleplay chat', 'uncensored AI roleplay', 'NSFW AI roleplay',
    'character AI roleplay', 'AI roleplay free', 'AI roleplay no filter',
    'AI roleplay chat online', 'NSFW roleplay AI', 'AI fantasy roleplay',
    'AI romance roleplay', 'best AI roleplay', 'free AI roleplay chat',
    'AI chat no filter',       // 3,000-6,000/mo
  ],
  alternates: { canonical: `${APP_URL}/ai-roleplay` },
  openGraph: {
    title: 'AI Roleplay — Uncensored AI Roleplay Chat Free | Veloura.ai',
    description:
      'Explore uncensored AI roleplay with no restrictions. Fantasy, romance, NSFW scenarios — roleplay with custom AI characters free.',
    url: `${APP_URL}/ai-roleplay`,
    siteName: 'Veloura.ai',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Roleplay — Uncensored, No Filter, Free | Veloura.ai',
    description:
      'Explore uncensored AI roleplay free. Fantasy, romance, NSFW — no content filters, no restrictions.',
  },
};

export default function AIRoleplayLayout({ children }: { children: ReactNode }) {
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
