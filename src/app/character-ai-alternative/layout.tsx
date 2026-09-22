import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { SidebarProvider } from '@/context/SidebarContext';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

// "character ai alternative"          = 4,400/mo, KD 29%
// "character ai alternative no filter" = 260/mo,  KD 20%
export const metadata: Metadata = {
  title: 'Character AI Alternative — No Filter, No Restrictions (2026) | Veloura.ai',
  description:
    'The best Character AI alternative with no content filters. Veloura.ai lets you chat, roleplay, and create with zero restrictions — the NSFW freedom Character.AI blocks.',
  keywords: [
    'character ai alternative',           // 4,400/mo, KD 29%
    'character ai alternative no filter', // 260/mo, KD 20%
    'character ai nsfw alternative',
    'uncensored character ai',
    'character ai without filter',
    'character ai no restrictions',
    'better than character ai',
    'character ai replacement',
    'character ai nsfw',
    'sites like character ai but nsfw',
    'character ai alternative nsfw 2026',
    'free character ai alternative',
    'character ai alternative uncensored',
  ],
  alternates: { canonical: `${APP_URL}/character-ai-alternative` },
  openGraph: {
    title: 'Character AI Alternative — No Filter, No Restrictions | Veloura.ai',
    description:
      'The best Character AI alternative with zero content filters. Chat, roleplay, NSFW — everything Character.AI blocks, we allow. Free to start.',
    url: `${APP_URL}/character-ai-alternative`,
    siteName: 'Veloura.ai',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Character AI Alternative — No Filter, No Restrictions | Veloura.ai',
    description:
      'The best Character AI alternative. Everything Character.AI blocks, we allow. NSFW, no filters, free.',
  },
};

export default function CharacterAIAlternativeLayout({ children }: { children: ReactNode }) {
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
