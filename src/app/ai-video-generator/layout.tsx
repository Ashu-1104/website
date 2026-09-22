import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { SidebarProvider } from '@/context/SidebarContext';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

// "AI video generator" = 165,000/mo (real Semrush) — no dedicated competitor pages exist
export const metadata: Metadata = {
  title: 'AI Video Generator — Create AI Videos Online Free | Veloura.ai',
  description:
    'Generate AI videos online free. Create deepfake videos, AI kissing videos, motion transfer animations, and more. No editing skills needed — instant AI video creation.',
  keywords: [
    'AI video generator',         // 165,000/mo — no dedicated competitor pages
    'uncensored video generator', // 210/mo, trending up
    'AI video creator free', 'create AI videos online', 'generate AI video',
    'AI video maker online', 'AI video from image', 'AI video from photo',
    'text to video AI', 'AI deepfake video maker', 'AI deepfake generator',
    'AI kissing video creator', 'AI motion transfer', 'AI video effects',
    'AI generated video', 'NSFW AI video generator', 'AI companion video',
    'AI girlfriend video', 'free AI video generator',
  ],
  alternates: { canonical: `${APP_URL}/ai-video-generator` },
  openGraph: {
    title: 'AI Video Generator — Create AI Videos Online Free | Veloura.ai',
    description:
      'Generate AI videos online free. Deepfake videos, AI kissing videos, motion transfer, and more. No editing skills — instant AI video creation.',
    url: `${APP_URL}/ai-video-generator`,
    siteName: 'Veloura.ai',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Video Generator — Free Online AI Video Creator | Veloura.ai',
    description:
      'Create AI videos free online. Deepfake videos, AI kissing videos, motion transfer animations — instant, no editing skills.',
  },
};

export default function AIVideoGeneratorLayout({ children }: { children: ReactNode }) {
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
