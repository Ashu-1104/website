import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

export const metadata: Metadata = {
  title: 'LoRA Training — Train Your Own AI Girlfriend or Character Model',
  // ≤155 chars
  description:
    'Train a custom LoRA model on your AI girlfriend or character images. Create a unique, consistent virtual partner model for high-quality AI generation. Free online.',
  keywords: [
    // Virtual partner angle — the real use case on this site
    'train AI girlfriend model', 'custom AI girlfriend LoRA', 'AI character model training',
    'train virtual partner AI', 'create AI character model', 'AI girlfriend model creator',
    // Technical searches from users who know LoRA
    'LoRA training online', 'custom LoRA model', 'stable diffusion LoRA training',
    'train LoRA model free', 'fine-tune AI model', 'LoRA training tool',
    'NSFW LoRA training', 'custom stable diffusion model',
  ],
  alternates: { canonical: `${APP_URL}/lora-training` },
  openGraph: {
    title: 'LoRA Training — Train Your Own AI Girlfriend or Character Model | Veloura.ai',
    description:
      'Train a custom LoRA model on your AI girlfriend or character images. Create a consistent virtual partner model for high-quality AI generation — free online.',
    url: `${APP_URL}/lora-training`,
    siteName: 'Veloura.ai',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LoRA Training — Train Your Own AI Girlfriend or Character Model',
    description:
      'Train a custom LoRA model on your AI girlfriend or character images — free online LoRA training tool.',
  },
};

export default function LoraTrainingLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
