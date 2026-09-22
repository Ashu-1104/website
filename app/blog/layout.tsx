import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { SidebarProvider } from '@/context/SidebarContext';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

export const metadata: Metadata = {
  title: 'Blog — AI Girlfriend Guides, Tutorials & NSFW AI News | Veloura.ai',
  description:
    'Guides, tutorials, and comparisons for AI girlfriend apps, NSFW AI tools, LoRA training, and uncensored AI generation. Expert advice from Veloura.ai.',
  keywords: [
    'ai girlfriend guide', 'nsfw ai tutorial', 'lora training guide',
    'character ai alternative', 'best nsfw ai chat', 'uncensored ai tools',
    'ai companion blog', 'ai girlfriend blog', 'nsfw ai news',
  ],
  alternates: { canonical: `${APP_URL}/blog` },
  openGraph: {
    title: 'Blog — AI Girlfriend Guides, Tutorials & NSFW AI News | Veloura.ai',
    description: 'Guides, tutorials, and comparisons for AI girlfriend apps, NSFW AI tools, LoRA training, and uncensored AI generation.',
    url: `${APP_URL}/blog`,
    siteName: 'Veloura.ai',
    type: 'website',
  },
};

export default function BlogLayout({ children }: { children: ReactNode }) {
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
