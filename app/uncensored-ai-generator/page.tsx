export const dynamic = 'force-static';
export const revalidate = 86400;

import Image from 'next/image';
import Link from 'next/link';
import Footer from '@/components/Footer';
import FAQSchema from '@/components/seo/FAQSchema';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

const BREADCRUMB = [
  { name: 'Home', url: APP_URL },
  { name: 'Uncensored AI Generator', url: `${APP_URL}/uncensored-ai-generator` },
];

const FAQ_ITEMS = [
  { q: 'What is an uncensored AI generator?', a: 'An uncensored AI generator creates content — images, videos, chat, voice — without content filters. Unlike mainstream AI tools that block NSFW content, an uncensored AI generator allows you to generate anything you imagine with complete freedom.' },
  { q: 'Is Veloura.ai really uncensored?', a: 'Yes. Veloura.ai is built from the ground up with no content filters. All tools operate without restrictions — no jailbreaks required, no blocked keywords, no filtered outputs.' },
  { q: 'What can I generate with the uncensored AI?', a: 'You can generate uncensored AI images, create AI videos (deepfakes, kissing videos, motion transfer), chat with AI companions without restrictions, clone voices, edit images, and train custom LoRA models.' },
  { q: 'Is the uncensored AI generator free?', a: 'Yes. Veloura.ai is free to start. All major generation tools have a free tier. Premium plans unlock unlimited generation, higher resolution, and priority processing.' },
  { q: 'How is this different from Midjourney or DALL-E?', a: 'Midjourney, DALL-E, and most mainstream generators enforce strict content filters blocking NSFW content. Veloura.ai has no such restrictions — and combines image generation, video creation, AI chat, and audio tools in one platform.' },
];

const TOOLS = [
  { icon: '🖼️', title: 'Uncensored AI Images', desc: 'Generate photorealistic or artistic NSFW images from any text prompt. No blocked keywords, no filtered outputs.', href: '/create', cta: 'Generate Images' },
  { icon: '🎬', title: 'Uncensored AI Video', desc: 'Create deepfake videos, AI kissing videos, motion transfer — all with zero content restrictions.', href: '/ai-video-generator', cta: 'Create Videos' },
  { icon: '💬', title: 'Uncensored AI Chat', desc: 'Chat with custom AI companions — no filters, no blocked topics, explicit NSFW conversations fully supported.', href: '/ai-girlfriend-chat', cta: 'Start Chatting' },
  { icon: '✏️', title: 'AI Image Editor', desc: 'Edit any image — remove objects, swap faces, change backgrounds — with no content restrictions.', href: '/ai-image-editor', cta: 'Edit Images' },
  { icon: '🎙️', title: 'AI Voice Cloning', desc: 'Clone any voice and generate speech with no content filters. Create custom voice for your AI companion.', href: '/ai-audio/voice-cloning', cta: 'Clone Voices' },
  { icon: '🧬', title: 'LoRA Model Training', desc: 'Train a custom LoRA model on your AI character images for consistent, high-quality generation.', href: '/lora-training', cta: 'Train Models' },
];

export default function UncensoredAIGeneratorPage() {
  return (
    <div className="content-wrapper">
      <FAQSchema items={FAQ_ITEMS} />
      <BreadcrumbSchema items={BREADCRUMB} />

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <div className="relative mt-6 mb-14 overflow-hidden rounded-3xl">
        <Image
          src="https://images.unsplash.com/photo-1655720828018-edd2daec9349?auto=format&fit=crop&w=1400&q=80"
          alt="Uncensored AI Generator"
          width={1400}
          height={560}
          className="h-[343px] w-full object-cover opacity-25"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/85 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
        <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-[#ff3e8a]/5 to-transparent" />

        <div className="absolute inset-0 flex flex-col justify-center px-8 py-10">
          <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-[#ff3e8a]/30 bg-[#ff3e8a]/10 px-3 py-1 text-xs font-semibold text-[#ff3e8a]">
            ✦ 6 AI Tools, Zero Restrictions
          </span>
          <h1 className="text-2xl font-black leading-tight text-white sm:text-3xl lg:text-4xl">
            Uncensored AI Generator
            <br />
            <span className="bg-gradient-to-r from-[#ff3e8a] to-orange-400 bg-clip-text text-transparent">
              Images. Video. Chat. Voice.
            </span>
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/60 sm:text-base">
            The most powerful uncensored AI platform. Generate images, videos, voice, and chat
            with zero content restrictions. No filters, no jailbreaks, no blocked prompts.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/create" className="inline-flex items-center gap-2 rounded-xl bg-[#ff3e8a] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#ff3e8a]/30 transition hover:bg-[#ff3e8a]/90">
              Start Generating Free →
            </Link>
            <Link href="/ai-apps" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              Browse All AI Tools
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {[{ label: 'Zero Content Filters', icon: '🔓' }, { label: 'No Jailbreaks Needed', icon: '✅' }, { label: 'Free to Start', icon: '🆓' }].map((s) => (
              <span key={s.label} className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/50">{s.icon} {s.label}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── 3 criteria ────────────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">
          What Makes an AI Generator{' '}
          <span className="text-[#ff3e8a]">Truly Uncensored?</span>
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { icon: '🚫', title: 'No Prompt Blocking', desc: 'Your inputs are never refused or modified. You type what you want — the AI processes it.' },
            { icon: '🔓', title: 'No Output Filtering', desc: 'Generated content is never censored, blurred, or replaced with safe alternatives.' },
            { icon: '🎯', title: 'No Jailbreaks Needed', desc: 'NSFW content works natively from the first generation — no workarounds, no tricks.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#12121a] p-6 transition-all hover:border-[#ff3e8a]/40 hover:shadow-[0_0_20px_rgba(255,62,138,0.1)]">
              <span className="mb-3 block text-3xl">{icon}</span>
              <h3 className="font-bold text-white">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/50">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tools grid ────────────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">All Uncensored AI Tools</h2>
        <p className="mt-2 text-sm text-white/50">6 categories of AI generation — all uncensored, all free to start.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map(({ icon, title, desc, href, cta }) => (
            <div key={title} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#12121a] p-5 transition-all hover:border-[#ff3e8a]/40 hover:shadow-[0_0_20px_rgba(255,62,138,0.08)]">
              <span className="mb-3 block text-3xl">{icon}</span>
              <h3 className="font-bold text-white">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/50">{desc}</p>
              <Link href={href} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#ff3e8a] hover:underline">
                {cta} →
              </Link>
              <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-[#ff3e8a]/5 transition-all group-hover:bg-[#ff3e8a]/10" />
            </div>
          ))}
        </div>
      </div>

      {/* ── Mid banner ────────────────────────────────────────────────────────── */}
      <div className="relative mb-14 overflow-hidden rounded-3xl">
        <Image
          src="https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1400&q=80"
          alt="AI generation unlimited"
          width={1400}
          height={400}
          className="h-44 w-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] to-[#0a0a0f]/70" />
        <div className="absolute inset-0 flex items-center justify-between px-8">
          <div>
            <p className="text-lg font-black text-white sm:text-2xl">Generate anything. <span className="text-[#ff3e8a]">No limits.</span></p>
            <p className="mt-1 text-sm text-white/50">Images · Videos · Chat · Voice · LoRA Training</p>
          </div>
          <Link href="/create" className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-[#ff3e8a] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#ff3e8a]/30 transition hover:bg-[#ff3e8a]/90">
            Start Free →
          </Link>
        </div>
      </div>

      {/* ── What you can create ───────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">What Can You Create?</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            { icon: '🔞', text: 'NSFW AI images of your custom AI girlfriend or companion' },
            { icon: '🎬', text: 'Deepfake videos with face swapping and photorealistic results' },
            { icon: '💬', text: 'Uncensored AI chat — any topic, any scenario' },
            { icon: '😘', text: 'AI kissing videos and motion transfer animations' },
            { icon: '🎙️', text: 'Custom AI voice clones for your companion characters' },
            { icon: '🧬', text: 'LoRA models for consistent AI character generation' },
            { icon: '✏️', text: 'Edit any image — remove clothing, change backgrounds, swap faces' },
            { icon: '🎵', text: 'AI music and song generation with no lyric restrictions' },
          ].map(({ icon, text }) => (
            <li key={text} className="flex items-start gap-3 rounded-xl border border-white/10 bg-[#12121a] px-4 py-3">
              <span className="text-xl shrink-0">{icon}</span>
              <span className="text-sm text-white/60">{text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── FAQ ───────────────────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">Frequently Asked Questions</h2>
        <div className="mt-6 space-y-3">
          {FAQ_ITEMS.map(({ q, a }) => (
            <details key={q} className="group rounded-2xl border border-white/10 bg-[#12121a] transition-colors hover:border-white/20">
              <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-semibold text-white select-none marker:hidden">
                <span>{q}</span>
                <span className="ml-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 text-[#ff3e8a] transition-transform duration-200 group-open:rotate-45">+</span>
              </summary>
              <p className="border-t border-white/10 px-5 py-4 text-sm leading-relaxed text-white/50">{a}</p>
            </details>
          ))}
        </div>
      </div>

      {/* ── CTA ───────────────────────────────────────────────────────────────── */}
      <div className="relative mb-14 overflow-hidden rounded-3xl bg-gradient-to-br from-[#ff3e8a]/20 via-[#1a0a14] to-[#0a0a1a] p-10 text-center">
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-[#ff3e8a]/20 blur-3xl" />
        <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative z-10">
          <h2 className="text-2xl font-black text-white sm:text-3xl">Explore All Uncensored AI Tools</h2>
          <p className="mt-3 text-sm text-white/50">Images, video, chat, voice — all free to start, all uncensored.</p>
          <Link href="/ai-apps" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#ff3e8a] px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-[#ff3e8a]/30 transition hover:bg-[#ff3e8a]/90">
            Browse All AI Tools →
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
