import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

export const metadata: Metadata = {
  title: { absolute: 'AI Art Community — Share & Discover Uncensored AI Generated Art | Veloura.ai' },
  description:
    'Join the Veloura.ai community. Share and discover AI-generated art, NSFW AI images, AI videos, and creations made by real users. No restrictions.',
  keywords: [
    'AI art community', 'AI generated art gallery', 'NSFW AI art community',
    'uncensored AI art gallery', 'share AI art', 'AI image community',
    'AI art feed', 'community AI images', 'AI art social',
    'user generated AI art', 'AI art showcase', 'NSFW AI gallery',
  ],
  alternates: { canonical: `${APP_URL}/community` },
  openGraph: {
    title: 'AI Art Community — Share & Discover Uncensored AI Generated Art',
    description: 'Discover and share AI-generated art, NSFW images, and AI videos. Join the Veloura.ai community.',
    url: `${APP_URL}/community`,
    siteName: 'Veloura.ai',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Art Community — Share & Discover Uncensored AI Generated Art',
    description: 'Discover and share AI-generated art, NSFW images, and AI videos with the Veloura.ai community.',
  },
};

export default function CommunityLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
