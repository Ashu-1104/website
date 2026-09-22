import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

export const metadata: Metadata = {
  title: { absolute: 'AI Models — Browse Custom Stable Diffusion & LoRA Models | Veloura.ai' },
  description:
    'Browse and use custom AI models including Stable Diffusion checkpoints and LoRA models. Create stunning uncensored AI art with community-trained models.',
  keywords: [
    'AI models', 'stable diffusion models', 'LoRA models', 'custom AI models',
    'stable diffusion checkpoints', 'NSFW AI models', 'uncensored AI models',
    'AI art models free', 'stable diffusion LoRA', 'AI image generation models',
    'community AI models', 'realistic AI models', 'anime AI models',
  ],
  alternates: { canonical: `${APP_URL}/models` },
  openGraph: {
    title: 'AI Models — Browse Custom Stable Diffusion & LoRA Models',
    description: 'Browse and use custom AI models including Stable Diffusion checkpoints and LoRA models for uncensored AI art generation.',
    url: `${APP_URL}/models`,
    siteName: 'Veloura.ai',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Models — Browse Custom Stable Diffusion & LoRA Models',
    description: 'Browse custom AI models and LoRAs for uncensored AI art generation.',
  },
};

export default function ModelsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
