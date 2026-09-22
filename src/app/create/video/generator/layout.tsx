import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

export const metadata: Metadata = {
  title: { absolute: 'AI Video Generator — Text-to-Video & Image-to-Video Online | Veloura.ai' },
  description:
    'Generate AI videos from text prompts or animate still images with AI. Cinematic, anime, realistic, and NSFW-friendly video generation — free to start, no installs, no watermark on paid plans.',
  keywords: [
    'AI video generator', 'text to video AI', 'image to video AI', 'AI video maker free',
    'AI video from prompt', 'NSFW AI video generator', 'uncensored AI video generator',
    'AI video creator online', 'generate video with AI', 'free AI video generator',
  ],
  alternates: { canonical: `${APP_URL}/create/video/generator` },
  openGraph: {
    title: 'AI Video Generator — Text-to-Video & Image-to-Video Online',
    description: 'Generate AI videos from text prompts or animate still images. Free, NSFW supported, no installs.',
    url: `${APP_URL}/create/video/generator`,
    siteName: 'Veloura.ai',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Video Generator — Text-to-Video & Image-to-Video Online',
    description: 'Generate AI videos from text or animate still images. Free to start.',
  },
};

export default function VideoGeneratorLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
