import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { SidebarProvider } from '@/context/SidebarContext';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

export const metadata: Metadata = {
  title: 'AI Boyfriend — Chat with Your Perfect AI Boyfriend Free | Veloura.ai',
  description:
    'Create your perfect AI boyfriend and chat with no restrictions. Romantic, caring, flirty or dominant — design his personality and appearance. Free AI boyfriend chat with voice & image generation.',
  keywords: [
    'AI boyfriend', 'AI boyfriend app', 'virtual boyfriend', 'talk to AI boyfriend',
    'AI boyfriend free', 'chat with AI boyfriend', 'AI boyfriend generator',
    'create AI boyfriend', 'best AI boyfriend app', 'AI boyfriend no filter',
    'uncensored AI boyfriend', 'NSFW AI boyfriend', 'AI boyfriend online',
    'realistic AI boyfriend', 'AI male companion',
  ],
  alternates: { canonical: `${APP_URL}/ai-boyfriend` },
  openGraph: {
    title: 'AI Boyfriend — Chat with Your Perfect AI Boyfriend Free | Veloura.ai',
    description:
      'Create your perfect AI boyfriend — romantic, caring, or dominant. Chat free with no restrictions. Voice, images & NSFW content included.',
    url: `${APP_URL}/ai-boyfriend`,
    siteName: 'Veloura.ai',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Boyfriend — Free, Uncensored, No Filter | Veloura.ai',
    description:
      'Create your perfect AI boyfriend and chat free. No restrictions, no filters. Voice & image generation included.',
  },
};

export default function AIBoyfriendLayout({ children }: { children: ReactNode }) {
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
