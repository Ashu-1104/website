import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Footer from '@/components/Footer';
import { aiAudioTools, getAIAudioToolBySlug } from '@/data/aiAudioTools';
import TextToSpeechSEOContent from '@/components/ai-audio/seo/TextToSpeechSEOContent';
import VoiceCloningSEOContent from '@/components/ai-audio/seo/VoiceCloningSEOContent';
import SoundEffectSEOContent from '@/components/ai-audio/seo/SoundEffectSEOContent';
import SongCoverSEOContent from '@/components/ai-audio/seo/SongCoverSEOContent';
import SongGenerationSEOContent from '@/components/ai-audio/seo/SongGenerationSEOContent';
import MusicGenerationSEOContent from '@/components/ai-audio/seo/MusicGenerationSEOContent';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

const AUDIO_TOOL_SEO: Record<string, { title: string; description: string; keywords: string[] }> = {
  'text-to-speech': {
    title: 'AI Text to Speech — Realistic AI Voice Generator Free | Veloura.ai',
    description: 'Convert text to realistic speech with AI. Free text to speech tool with natural-sounding voices. Generate audio from any text instantly online.',
    keywords: ['text to speech AI', 'AI text to speech free', 'realistic text to speech', 'AI voice generator', 'text to speech online', 'natural AI voice generator'],
  },
  'voice-cloning': {
    title: 'AI Voice Cloning — Clone Any Voice Online Free | Veloura.ai',
    description: 'Clone any voice with AI. Upload a voice sample and generate realistic speech in that voice. Free AI voice cloning tool online.',
    keywords: ['AI voice cloning free', 'voice cloning online', 'clone voice AI', 'voice cloning tool', 'AI voice clone', 'free voice cloning online'],
  },
  'sound-effect': {
    title: 'AI Sound Effect Generator — Generate Sound Effects from Text | Veloura.ai',
    description: 'Generate custom sound effects from text prompts with AI. Free AI sound effect generator — create any sound effect online in seconds.',
    keywords: ['AI sound effects generator', 'generate sound effects AI', 'AI audio generator', 'text to sound effect', 'free sound effect generator AI'],
  },
  'song-cover-fun': {
    title: 'AI Song Cover Generator — Create AI Voice Covers Free | Veloura.ai',
    description: 'Create AI song covers using any voice with AI. Upload an MP3 or URL and get a full AI voice cover instantly. Free online song cover generator.',
    keywords: ['AI song cover', 'voice cover AI', 'AI cover song generator', 'AI singing voice', 'song cover generator free', 'AI vocal cover'],
  },
  'song-generation-vocal': {
    title: 'AI Song Generator — Generate Songs with Vocals Online Free | Veloura.ai',
    description: 'Generate original songs with AI vocals from audio samples. Free AI song generator — create full vocal tracks online in seconds.',
    keywords: ['AI song generator', 'AI music generator with vocals', 'generate song AI', 'AI vocal song generator', 'create song with AI', 'AI song creator free'],
  },
  'music-generation-no-vocal': {
    title: 'AI Music Generator — Generate Instrumental Music Free | Veloura.ai',
    description: 'Generate original instrumental music with AI from text prompts. Free AI music generator — create background music, beats, and soundtracks online.',
    keywords: ['AI music generator', 'AI instrumental music generator', 'generate music AI free', 'AI beat generator', 'AI soundtrack generator', 'create music with AI'],
  },
};

export async function generateMetadata(
  { params }: { params: { tool: string } }
): Promise<Metadata> {
  const tool = getAIAudioToolBySlug(params.tool);
  if (!tool) return {};

  const seo = AUDIO_TOOL_SEO[params.tool];
  const title = seo?.title ?? `${tool.label} — Free AI Audio Tool | Veloura.ai`;
  const description = seo?.description ?? `Use the free AI ${tool.label} tool on Veloura.ai.`;
  const keywords = seo?.keywords ?? [];
  const canonical = `${APP_URL}/ai-audio/${params.tool}`;

  return {
    title,
    description,
    keywords,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'Veloura.ai',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

const PlaygroundLoading = () => (
  <div className="mt-6 flex min-h-[300px] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
  </div>
);

const TextToSpeechPlayground = dynamic(() => import('@/components/ai-audio/TextToSpeechPlayground'), { loading: PlaygroundLoading, ssr: false });
const VoiceCloningPlayground = dynamic(() => import('@/components/ai-audio/VoiceCloningPlayground'), { loading: PlaygroundLoading, ssr: false });
const SfxPlayground = dynamic(() => import('@/components/ai-audio/SfxPlayground'), { loading: PlaygroundLoading, ssr: false });
const VoiceCoverPlayground = dynamic(() => import('@/components/ai-audio/VoiceCoverPlayground'), { loading: PlaygroundLoading, ssr: false });
const SongGeneratorPlayground = dynamic(() => import('@/components/ai-audio/SongGeneratorPlayground'), { loading: PlaygroundLoading, ssr: false });
const MusicGenPlayground = dynamic(() => import('@/components/ai-audio/MusicGenPlayground'), { loading: PlaygroundLoading, ssr: false });

export const dynamicParams = false;

export function generateStaticParams() {
  return aiAudioTools.map((tool) => ({ tool: tool.slug }));
}

export default function AIAudioToolPage({ params }: { params: { tool: string } }) {
  const tool = getAIAudioToolBySlug(params.tool);
  if (!tool) notFound();

  return (
    <>
      <div className="content-wrapper">
        <div className="flex items-center gap-3">
          <Link
            href="/ai-audio"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-text-secondary transition hover:bg-white/10 hover:text-white"
            aria-label="Back to AI Audio"
          >
            ←
          </Link>
          <h1 className="page-title">{tool.label}</h1>
        </div>
        {tool.slug === 'text-to-speech' ? (
          <>
            <p className="mt-2 text-text-secondary">
              Generate speech by providing a text input along with a pretrained voice.
            </p>
            <TextToSpeechPlayground />
          </>
        ) : tool.slug === 'voice-cloning' ? (
          <>
            <p className="mt-2 text-text-secondary">
              Clone a voice from a sample (or a saved voice_id) and generate speech from text.
            </p>
            <VoiceCloningPlayground />
          </>
        ) : tool.slug === 'sound-effect' ? (
          <>
            <p className="mt-2 text-text-secondary">
              Generate sound effects by describing what you want to hear.
            </p>
            <SfxPlayground />
          </>
        ) : tool.slug === 'song-cover-fun' ? (
          <>
            <p className="mt-2 text-text-secondary">
              Upload an MP3 or paste a YouTube Music link, pick a voice, and generate a voice cover.
            </p>
            <VoiceCoverPlayground />
          </>
        ) : tool.slug === 'song-generation-vocal' ? (
          <>
            <p className="mt-2 text-text-secondary">
              Generate a full song with vocals from a prompt. Choose a style, write lyrics or let AI generate them.
            </p>
            <SongGeneratorPlayground />
          </>
        ) : tool.slug === 'music-generation-no-vocal' ? (
          <>
            <p className="mt-2 text-text-secondary">
              Generate instrumental music from a prompt, with optional melody conditioning.
            </p>
            <MusicGenPlayground />
          </>
        ) : (
          <p className="mt-2 text-text-secondary">Playground coming soon.</p>
        )}
        {/* SEO content — shown below the playground, unique per tool */}
        {params.tool === 'text-to-speech' && <TextToSpeechSEOContent />}
        {params.tool === 'voice-cloning' && <VoiceCloningSEOContent />}
        {params.tool === 'sound-effect' && <SoundEffectSEOContent />}
        {params.tool === 'song-cover-fun' && <SongCoverSEOContent />}
        {params.tool === 'song-generation-vocal' && <SongGenerationSEOContent />}
        {params.tool === 'music-generation-no-vocal' && <MusicGenerationSEOContent />}
      </div>
      <Footer />
    </>
  );
}
