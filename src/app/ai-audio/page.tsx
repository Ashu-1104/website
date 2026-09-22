import type { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/Footer';
import { aiAudioTools } from '@/data/aiAudioTools';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

export const metadata: Metadata = {
  title: 'AI Audio Tools — Voice Cloning, Text to Speech, AI Music & More | Veloura.ai',
  description:
    'Free AI audio tools: voice cloning, text to speech, AI song generator, music generation, sound effects, and voice covers. Realistic AI voices with no restrictions.',
  keywords: [
    'AI voice cloning free', 'voice cloning online', 'text to speech AI',
    'AI text to speech realistic', 'AI song generator', 'AI music generator',
    'AI sound effects generator', 'voice cover AI', 'AI speech generator',
    'free AI voice cloning', 'AI voice generator', 'clone voice AI online',
    'AI music generation free', 'AI audio tools', 'realistic AI voice',
  ],
  alternates: { canonical: `${APP_URL}/ai-audio` },
  openGraph: {
    title: 'AI Audio Tools — Voice Cloning, Text to Speech, AI Music & More',
    description: 'Free AI audio tools: voice cloning, text to speech, AI song generator, music generation, sound effects, and voice covers.',
    url: `${APP_URL}/ai-audio`,
    siteName: 'Veloura.ai',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Audio Tools — Voice Cloning, Text to Speech, AI Music & More',
    description: 'Free AI audio tools: voice cloning, text to speech, AI song generator, music generation, and more.',
  },
};

function getToolDescription(slug: string) {
  if (slug === 'text-to-speech') return 'Generate speech from text with pretrained voices.';
  if (slug === 'voice-cloning') return 'Clone a voice from a sample and generate speech from text.';
  if (slug === 'sound-effect') return 'Generate sound effects from a text prompt.';
  if (slug === 'song-cover-fun') return 'Generate a voice cover from an MP3 or URL.';
  if (slug === 'song-generation-vocal') return 'Generate a vocal song from an input audio sample.';
  if (slug === 'music-generation-no-vocal') return 'Generate instrumental music from a text prompt.';
  return 'Playground coming soon.';
}

export default function AIAudioPage() {
  return (
    <>
      <div className="content-wrapper">
        <h1 className="page-title">AI Audio</h1>
        <p className="mt-2 text-text-secondary">Pick a tool to open its playground.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {aiAudioTools.map((tool) => (
            <Link
              key={tool.slug}
              href={`/ai-audio/${tool.slug}`}
              className="rounded-xl border border-white/10 bg-[var(--bg-secondary)] p-5 transition hover:bg-[var(--bg-tertiary)]"
            >
              <div className="text-base font-semibold text-white">{tool.label}</div>
              <div className="mt-2 text-sm text-text-secondary">{getToolDescription(tool.slug)}</div>
            </Link>
          ))}
        </div>
      </div>
      <Footer />
    </>
  );
}
