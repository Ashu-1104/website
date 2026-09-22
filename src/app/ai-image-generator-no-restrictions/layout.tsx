import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { SidebarProvider } from '@/context/SidebarContext';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

export const metadata: Metadata = {
  title: 'AI Image Generator No Restrictions — Free, Uncensored, NSFW | Veloura.ai',
  description:
    'AI image generator with no restrictions. Generate NSFW, explicit, and adult content from text with zero blocked prompts, zero filtered outputs. Free to start — no sign-up required.',
  keywords: [
    'ai image generator no restrictions',      // 9,900/mo, KD 38% — PRIMARY
    'no restrictions ai image generator',      // 1,300/mo, KD 41%
    'free ai image generator no restrictions', // 880/mo, KD 53%
    'ai art generator no restrictions',        // 590/mo, KD 35%
    'ai image generator unrestricted',         // 480/mo, KD 40%
    'unrestricted ai image generator',         // 480/mo, KD 40%
    'nsfw ai image generator free',            // 2,400/mo, KD 36%
    'ai image generator no filter',            // 1,600/mo, KD 18%
    'uncensored ai image generator',           // 4,400/mo, KD 40%
    'uncensored ai image generator free',      // 1,900/mo, KD 36%
    'nsfw ai art generator',
    'unrestricted ai art',
    'no restrictions ai art',
  ],
  alternates: { canonical: `${APP_URL}/ai-image-generator-no-restrictions` },
  openGraph: {
    title: 'AI Image Generator No Restrictions — Free, Uncensored',
    description:
      'Generate any AI image with no restrictions. NSFW, explicit, adult content — fully supported. Zero blocked prompts. Free, no watermark, instant results.',
    url: `${APP_URL}/ai-image-generator-no-restrictions`,
    siteName: 'Veloura.ai',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Image Generator No Restrictions — Free Uncensored AI Art',
    description:
      'Generate any image with zero restrictions. NSFW, explicit, unrestricted. Free, no watermark, no sign-up.',
  },
};

export default function AIImageGeneratorNoRestrictionsLayout({ children }: { children: ReactNode }) {
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