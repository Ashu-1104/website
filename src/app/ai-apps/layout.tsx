import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { SidebarProvider } from '@/context/SidebarContext';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

export const metadata: Metadata = {
  title: { absolute: 'AI Apps & Tools — Face Swap, Background Remover, Deepfake & More | Veloura.ai' },
  description:
    'Free AI image and video tools: face swap, background remover, AI image upscaler, deepfake video maker, cloth swap, AI avatar generator, sketch to image, manga coloring, and more. No restrictions.',
  keywords: [
    'face swap AI free', 'AI face swap online', 'AI background remover free',
    'remove background AI', 'AI image upscaler', 'upscale image AI free',
    'deepfake video maker', 'AI video face swap', 'AI eraser remove objects',
    'cloth swap AI', 'AI avatar generator', 'sketch to image AI',
    'AI kissing video', 'AI filters online', 'manga colorizer AI',
    'AI inpainting', 'AI photo editor online', 'NSFW AI image editor',
    'uncensored AI image tools', 'AI image tools free',
  ],
  alternates: { canonical: `${APP_URL}/ai-apps` },
  openGraph: {
    title: 'AI Apps & Tools — Face Swap, Background Remover, Deepfake & More',
    description:
      'Free AI image and video tools: face swap, background remover, AI upscaler, deepfake maker, cloth swap, AI avatar generator, and more. No restrictions.',
    url: `${APP_URL}/ai-apps`,
    siteName: 'Veloura.ai',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Apps & Tools — Face Swap, Background Remover, Deepfake & More',
    description: 'Free AI tools: face swap, background remover, deepfake maker, cloth swap, AI avatar generator, and more.',
  },
};

export default function AIAppsLayout({ children }: { children: ReactNode }) {
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

