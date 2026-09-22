import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

export const metadata: Metadata = {
  // `absolute` bypasses root layout's `%s | Veloura.ai` template
  // (otherwise the rendered title double-suffixes with "| Veloura.ai | Veloura.ai").
  title: { absolute: 'AI Image Generator — Free NSFW, No Filter, No Restrictions | Veloura.ai' },
  description: 'Generate any AI image from text — NSFW, uncensored, no filter, no restrictions. Free AI image generator with no watermark. Instant results, no sign-up required.',
  keywords: [
    'free nsfw ai image generator',           // 5,400/mo, KD 21%
    'ai image generator no restrictions',      // 9,900/mo, KD 38%
    'ai image generator no filter',            // 1,600/mo, KD 18% — EASIEST WIN
    'uncensored ai image generator',           // 4,400/mo, KD 40%
    'uncensored ai generator',                 // 8,100/mo, KD 22%
    'nsfw ai image generator',                 // 9,900/mo, KD 47%
    'uncensored ai image generator free',      // 1,900/mo, KD 36%
    'no filter ai image generator',            // 880/mo, KD 43%
    'free ai image generator no restrictions',    // 880/mo, KD 53%
    'ai image generator with no restrictions',    // 880/mo, KD 38%
    'generate ai images with no restrictions',    // 880/mo, KD 42%
    'ai image generator free no restrictions',    // 480/mo, KD 45%
    'no restriction ai image generator',          // 480/mo, KD 52%
    'no restrictions ai image generator',         // 480/mo, KD 47%
    'ai image generator no restrictions free',    // 320/mo, KD 46%
    'ai image generator uncensored',              // 1,600/mo, KD 49%
    'free uncensored ai generator',               // 1,300/mo, KD 32%
    'AI image generator', 'text to image AI', 'AI art generator free',
    'image to image AI', 'stable diffusion online',
    'AI photo generator', 'AI picture generator', 'generate AI images free',
    'ai image generator free no sign up',
    'best nsfw ai image generator',
  ],
  alternates: { canonical: `${APP_URL}/create` },
  openGraph: {
    title: 'Free NSFW AI Image Generator — Uncensored, No Restrictions | Veloura.ai',
    description: 'Generate stunning NSFW AI images from text prompts or transform existing photos. Free uncensored AI image generator — photorealistic results, no watermark.',
    url: `${APP_URL}/create`,
    siteName: 'Veloura.ai',
    type: 'website',
    images: [
      {
        url: 'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/og-images/og-create.png',
        width: 1200,
        height: 630,
        alt: 'Generate Any Image. Zero Censorship. — Veloura.ai',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Image Generator — Free Text to Image & Image to Image | Veloura.ai',
    description: 'Generate stunning AI images from text prompts or transform existing photos. Free, uncensored, no watermark.',
    images: ['https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/og-images/og-create.png'],
  },
};

export default function CreateLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
