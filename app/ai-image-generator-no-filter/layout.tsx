import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { SidebarProvider } from '@/context/SidebarContext';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

export const metadata: Metadata = {
  title: 'AI Image Generator No Filter — Free, Uncensored, No Restrictions | Veloura.ai',
  description:
    'The only AI image generator with no filter. Generate any image from text — NSFW, explicit, unrestricted. Free, no watermark, no sign-up required. Try it instantly.',
  keywords: [
    'ai image generator no filter',        // 1,600/mo, KD 18% — EASIEST QUICK WIN
    'no filter ai image generator',        // 880/mo, KD 43%
    'ai image generator free no filter',   // 210/mo, KD 46%
    'free ai image generator no filter',   // 210/mo, KD 46%
    'ai generate image no filter',         // 170/mo, KD 45%
    'image generator ai no filter',        // 170/mo, KD 52%
    'ai image generator with no filter',   // 110/mo, KD 43%
    'ai image generator no restrictions',  // 9,900/mo, KD 38%
    'uncensored ai image generator',       // 4,400/mo, KD 40%
    'uncensored ai image generator free',  // 1,900/mo, KD 36%
    'free ai image generator no restrictions', // 880/mo, KD 53%
    'nsfw ai image generator',
    'uncensored image generator',
    'no restrictions ai image generator',
  ],
  alternates: { canonical: `${APP_URL}/ai-image-generator-no-filter` },
  openGraph: {
    title: 'AI Image Generator No Filter — Free, Uncensored',
    description:
      'Generate any AI image with no filter. NSFW, explicit, adult content — fully supported. Free, no watermark, instant results.',
    url: `${APP_URL}/ai-image-generator-no-filter`,
    siteName: 'Veloura.ai',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Image Generator No Filter — Free Uncensored AI Art',
    description:
      'Generate any image with zero content filters. NSFW, explicit, unrestricted. Free, no watermark.',
  },
};

export default function AIImageGeneratorNoFilterLayout({ children }: { children: ReactNode }) {
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
