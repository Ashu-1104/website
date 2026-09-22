import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { SidebarProvider } from '@/context/SidebarContext';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

// /pricing is the public marketing page — /subscription is the logged-in billing surface.
// Separation matters: competitors don't have a /pricing URL (per SEO report), so owning
// this slug captures high-intent "[brand] pricing" + "AI girlfriend cost" searches.
export const metadata: Metadata = {
  // `absolute` bypasses the root layout's `%s | Veloura.ai` template.
  // Without it, the rendered <title> double-suffixes to "... | Veloura.ai | Veloura.ai".
  title: { absolute: 'AI Girlfriend Pricing — Plans & Cost | Veloura.ai' },
  description:
    'Veloura.ai pricing — free plan with no credit card. Premium unlocks unlimited AI girlfriend chat, NSFW images, voice cloning & video. Compare all plans.',
  keywords: [
    'Veloura.ai pricing', 'AI girlfriend pricing', 'AI girlfriend cost',
    'AI girlfriend price', 'AI companion pricing', 'AI companion cost',
    'AI girlfriend subscription', 'AI girlfriend app cost', 'AI girlfriend plans',
    'NSFW AI pricing', 'uncensored AI pricing', 'uncensored AI cost',
    'AI girlfriend premium cost', 'best AI girlfriend app price',
    'AI girlfriend free vs premium', 'AI girlfriend monthly cost',
  ],
  alternates: { canonical: `${APP_URL}/pricing` },
  openGraph: {
    title: 'AI Girlfriend Pricing — Free & Premium Plans | Veloura.ai',
    description:
      'Free plan available — no credit card required. Premium plans unlock unlimited AI girlfriend chat, NSFW images, voice cloning, and AI video generation.',
    url: `${APP_URL}/pricing`,
    siteName: 'Veloura.ai',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: 'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/og-images/og-pricing.png',
        width: 1200,
        height: 630,
        alt: 'Veloura.ai — Pricing & Plans',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Girlfriend Pricing — Free & Premium Plans',
    description:
      'Free plan — no credit card. Premium unlocks unlimited AI girlfriend chat, NSFW images, voice cloning, and video.',
    images: ['https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/og-images/og-pricing.png'],
  },
};

export default function PricingLayout({ children }: { children: ReactNode }) {
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
