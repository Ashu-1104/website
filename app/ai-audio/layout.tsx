import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { SidebarProvider } from '@/context/SidebarContext';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

export const metadata: Metadata = {
  title: 'AI Audio Tools — Voice Cloning, Text to Speech & AI Music Generator',
  description: 'Free AI audio tools: text to speech, voice cloning, AI music generator, song covers, and sound effect generator. Create realistic AI voices and original music online.',
  keywords: [
    'AI audio tools', 'AI voice generator', 'text to speech AI free',
    'AI voice cloning', 'AI music generator', 'AI song generator',
    'sound effect generator AI', 'voice cloning online free', 'AI speech generator',
    'AI audio creator',
  ],
  alternates: { canonical: `${APP_URL}/ai-audio` },
  openGraph: {
    title: 'AI Audio Tools — Voice Cloning, Text to Speech & AI Music | Veloura.ai',
    description: 'Free AI audio tools: text to speech, voice cloning, AI music generator, song covers, and sound effects — all in one place.',
    url: `${APP_URL}/ai-audio`,
    siteName: 'Veloura.ai',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Audio Tools — Voice Cloning, Text to Speech & AI Music | Veloura.ai',
    description: 'Free AI audio tools: text to speech, voice cloning, AI music generator, song covers, and sound effects.',
  },
};

export default function AIAudioLayout({ children }: { children: ReactNode }) {
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

