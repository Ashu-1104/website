import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

export const metadata: Metadata = {
  title: { absolute: 'AI Video Tools — Generate Videos, Face Swap, Deepfake & More | Veloura.ai' },
  description: 'Create AI-generated videos with our free AI video tools. Generate videos from text, swap faces, transfer motion, create deepfakes, and more — all online.',
  keywords: [
    'AI video generator', 'AI video tools', 'AI video creator free',
    'text to video AI', 'AI deepfake video maker', 'AI motion transfer',
    'AI video maker online', 'AI video effects', 'generate video with AI',
    'AI video from image',
  ],
  alternates: { canonical: `${APP_URL}/create/video` },
  openGraph: {
    title: 'AI Video Tools — Generate Videos, Face Swap & More | Veloura.ai',
    description: 'Create AI-generated videos with our free suite of video tools. Generate, deepfake, upscale, and animate videos with AI — all online.',
    url: `${APP_URL}/create/video`,
    siteName: 'Veloura.ai',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Video Tools — Generate Videos, Face Swap & More | Veloura.ai',
    description: 'Create AI-generated videos with our free suite of video tools. Generate, deepfake, upscale, and animate videos with AI.',
  },
};

export default function CreateVideoLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
