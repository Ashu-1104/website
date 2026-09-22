import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

export const metadata: Metadata = {
  title: { absolute: 'AI Image Editor — Edit Photos with AI Inpainting & Generative Fill | Veloura.ai' },
  description: 'Edit any image with AI-powered inpainting and generative fill. Erase objects, replace areas, and transform photos with AI — free online image editor, no skills required.',
  keywords: [
    'AI image editor', 'AI inpainting tool', 'generative fill online',
    'AI photo editor free', 'edit image with AI', 'AI object removal',
    'AI image replacement', 'inpainting AI online', 'AI photo editing tool',
    'AI fill image',
  ],
  alternates: { canonical: `${APP_URL}/edit-image` },
  openGraph: {
    title: 'AI Image Editor — Inpainting & Generative Fill Online | Veloura.ai',
    description: 'Edit any image with AI-powered inpainting and generative fill. Erase and replace areas of any photo in seconds — free, no watermark.',
    url: `${APP_URL}/edit-image`,
    siteName: 'Veloura.ai',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Image Editor — Inpainting & Generative Fill Online | Veloura.ai',
    description: 'Edit any image with AI inpainting. Erase objects, replace areas, and transform photos — free online.',
  },
};

export default function EditImageLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
