import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

export const metadata: Metadata = {
  title: { absolute: 'AI Motion Transfer — Create AI Dance Videos & Character Animation | Veloura.ai' },
  description:
    'Animate any photo with AI motion transfer. Upload a character image and a reference video to create AI dance clips, character animations, and motion-matched videos — free, NSFW supported.',
  keywords: [
    'AI motion transfer', 'AI dance video generator', 'animate photo with AI',
    'AI character animation', 'motion transfer AI free', 'AI video from photo',
    'AI dance AI generator', 'deepfake dance AI', 'character animation online',
    'NSFW motion transfer',
  ],
  alternates: { canonical: `${APP_URL}/create/video/motion-transfer` },
  openGraph: {
    title: 'AI Motion Transfer — Create AI Dance Videos & Character Animation',
    description: 'Animate any photo with AI motion transfer. Upload a character image + reference video, generate AI dance clips.',
    url: `${APP_URL}/create/video/motion-transfer`,
    siteName: 'Veloura.ai',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Motion Transfer — Create AI Dance Videos & Character Animation',
    description: 'Animate any photo with AI motion transfer. Free, NSFW supported.',
  },
};

export default function MotionTransferLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
