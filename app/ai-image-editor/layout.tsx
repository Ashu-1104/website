import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { SidebarProvider } from '@/context/SidebarContext';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

// "AI image editor" = 60,500/mo (real Semrush) — ZERO competitor coverage, first-mover advantage
export const metadata: Metadata = {
  title: 'AI Image Editor — Edit Photos with AI Free Online | Veloura.ai',
  description:
    'Edit any image with AI — remove objects, change backgrounds, swap faces, upscale resolution, and more. Free AI image editor online. No skills required, instant results.',
  keywords: [
    'AI image editor',                       // 60,500/mo
    'uncensored ai image editor',            // 1,300/mo, KD 20% — EASY WIN
    'uncensored ai image generator',         // 4,400/mo, KD 40%
    'ai image generator no restrictions',    // 9,900/mo, KD 38%
    'ai image generator no filter',          // 1,600/mo, KD 18%
    'AI image editing',
    'edit image with AI',
    'AI photo editor free', 'AI photo editing tool', 'AI edit photos online',
    'AI image editing tool', 'AI generative fill', 'AI inpainting tool',
    'edit AI generated images', 'AI photo editor online', 'AI image manipulation',
    'free AI image editor', 'AI image editor no sign up', 'AI object removal',
    'AI background changer', 'AI face swap editor', 'AI image upscaler',
    'NSFW AI image editor', 'uncensored image editor',
  ],
  alternates: { canonical: `${APP_URL}/ai-image-editor` },
  openGraph: {
    title: 'AI Image Editor — Edit Photos with AI Free Online | Veloura.ai',
    description:
      'Edit any image with AI — remove objects, change backgrounds, swap faces, upscale resolution, and more. Free, instant, no skills required.',
    url: `${APP_URL}/ai-image-editor`,
    siteName: 'Veloura.ai',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Image Editor — Free Online, No Skills Required | Veloura.ai',
    description:
      'Edit any image with AI — remove objects, change backgrounds, swap faces, upscale, and more. Free, instant results.',
  },
};

export default function AIImageEditorLayout({ children }: { children: ReactNode }) {
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
