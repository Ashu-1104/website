import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

export const metadata: Metadata = {
  title: { absolute: 'Create Your Own AI Character — Custom AI Girlfriend & Companion | Veloura.ai' },
  description:
    'Create your own custom AI character, AI girlfriend, or virtual companion. Choose appearance, personality, voice, and style. Build your perfect AI partner — free to start.',
  keywords: [
    'create your own AI character', 'create AI girlfriend', 'custom AI girlfriend',
    'design AI character', 'AI character creator', 'make AI girlfriend online',
    'create AI companion', 'create realistic AI girlfriend', 'build AI girlfriend',
    'custom AI partner', 'personalized AI companion', 'AI character builder',
    'create virtual AI girlfriend', 'make your own AI character', 'AI girlfriend creator',
  ],
  alternates: { canonical: `${APP_URL}/create-your-own-ai-character` },
  openGraph: {
    title: 'Create Your Own AI Character — Custom AI Girlfriend & Companion',
    description: 'Create your own custom AI girlfriend or companion. Choose appearance, personality, voice, and style. Build your perfect AI partner free.',
    url: `${APP_URL}/create-your-own-ai-character`,
    siteName: 'Veloura.ai',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Create Your Own AI Character — Custom AI Girlfriend & Companion',
    description: 'Create your perfect AI girlfriend or virtual companion. Choose appearance, personality, voice, and style — free to start.',
  },
};

export default function CreateAICharacterLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
