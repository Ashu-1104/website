export const dynamic = 'force-static';
export const revalidate = 86400;

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import Footer from '@/components/Footer';
import FAQSchema from '@/components/seo/FAQSchema';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

export const metadata: Metadata = {
  title: 'How to Train a WAN 2.2 LoRA — Complete Guide (2026) | Veloura.ai',
  description:
    'Complete guide to training a WAN 2.2 LoRA model for AI video generation. Dataset preparation, training parameters, and tips for high-quality AI character video LoRAs.',
  keywords: [
    'how to train wan2.2 lora',
    'wan 2.2 lora training',
    'wan lora training',
    'train wan lora',
    'wan 2.2 lora guide',
    'wan video lora',
    'ai video lora training',
  ],
  alternates: { canonical: `${APP_URL}/blog/how-to-train-wan-2-2-lora` },
  openGraph: {
    title: 'How to Train a WAN 2.2 LoRA — Complete Guide (2026)',
    description: 'Step-by-step guide to WAN 2.2 LoRA training for AI video generation.',
    url: `${APP_URL}/blog/how-to-train-wan-2-2-lora`,
    siteName: 'Veloura.ai',
    type: 'article',
  },
};

const BREADCRUMB = [
  { name: 'Home', url: APP_URL },
  { name: 'Blog', url: `${APP_URL}/blog` },
  { name: 'How to Train WAN 2.2 LoRA', url: `${APP_URL}/blog/how-to-train-wan-2-2-lora` },
];

const FAQ_ITEMS = [
  { q: 'What is WAN 2.2?', a: 'WAN 2.2 (also referred to as Wan Video 2.2) is a Chinese-developed AI video generation model capable of producing high-quality video content from images or text prompts. It is one of the most capable open-source video generation models available, with strong motion quality and temporal consistency.' },
  { q: 'What is a WAN 2.2 LoRA used for?', a: 'A WAN 2.2 LoRA teaches the video model to consistently generate a specific person, character, or subject in video outputs. For AI companion use cases, a WAN 2.2 LoRA means your AI girlfriend or custom character maintains their recognisable appearance across generated videos, not just static images.' },
  { q: 'How is WAN 2.2 LoRA different from image LoRAs?', a: 'Image LoRAs (Flux, SDXL) are trained on static images and only affect image generation. WAN 2.2 LoRAs are trained on video frames and affect video generation — teaching the model how your character moves, animates, and appears across video frames over time.' },
  { q: 'How many images or videos do I need to train a WAN 2.2 LoRA?', a: 'For a WAN 2.2 character LoRA, 20–50 still images (extracted as video frames) or 3–5 short video clips of your subject typically produces good results. Temporal diversity — different movements and actions — improves video output quality.' },
  { q: 'Can I use a WAN 2.2 LoRA for NSFW AI videos?', a: 'On platforms that support it — including Veloura.ai — WAN 2.2 LoRAs can be used for NSFW AI video generation featuring your trained character. No content restrictions apply to the video generation tools on Veloura.ai.' },
];

const STEPS = [
  {
    step: '01',
    icon: '🎬',
    title: 'Prepare Your Training Data',
    content: [
      'Collect 20–50 high-quality images of your subject (still images work; video frames are better)',
      'If you have video footage, extract frames at 2–5 fps to get temporal diversity',
      'Target resolution: 480p–720p for video frames (WAN 2.2 native resolution)',
      'Include variety: different poses, expressions, lighting, partial body shots',
      'Avoid heavily edited, filtered, or stylised images — natural-looking source material trains better',
    ],
  },
  {
    step: '02',
    icon: '🖥️',
    title: 'Set Up Your Training Environment',
    content: [
      'WAN 2.2 LoRA training requires significant VRAM — 40GB+ recommended (A100 or H100)',
      'Community training scripts are available on GitHub for WAN 2.2 LoRA fine-tuning',
      'Cloud compute options: Runpod (A100 instances), Vast.ai, or Lambda Labs',
      'Veloura.ai\'s online LoRA trainer handles video model training without local GPU setup',
      'Install dependencies: Python 3.10+, PyTorch with CUDA, model weights (~15GB)',
    ],
  },
  {
    step: '03',
    icon: '⚙️',
    title: 'Configure Training Parameters',
    content: [
      'Training steps: 500–1,500 (video LoRAs train faster due to temporal data)',
      'Learning rate: 0.00005–0.0001 (lower than image LoRAs — video models are more sensitive)',
      'LoRA rank: 16–32 is typically sufficient for character identity in video',
      'Batch size: 1–2 (video training is memory-intensive)',
      'Trigger word: Use a unique short token not found in natural language',
      'Frame sampling: 8–16 frames per video clip during training',
    ],
  },
  {
    step: '04',
    icon: '📈',
    title: 'Train and Validate',
    content: [
      'Training takes 30–120 minutes on A100 hardware depending on dataset size',
      'Monitor training loss — should decrease smoothly over the training run',
      'Save checkpoints every 100–200 steps for intermediate testing',
      'Test at 30%, 60%, and 100% of training to find the optimal checkpoint',
    ],
  },
  {
    step: '05',
    icon: '🎥',
    title: 'Generate and Test Videos',
    content: [
      'Load your finished WAN 2.2 LoRA in a compatible video generation tool',
      'Test with: "[trigger] person walking, natural lighting" — check face consistency',
      'Test motion quality: smooth animation without artifacts or face drift',
      'Optimal LoRA weight for WAN 2.2: 0.6–0.8 (balance identity with motion quality)',
      'For NSFW video generation, Veloura.ai supports WAN 2.2 LoRA deployment',
    ],
  },
];

export default function WAN22LoRAPage() {
  return (
    <div className="content-wrapper">
      <FAQSchema items={FAQ_ITEMS} />
      <BreadcrumbSchema items={BREADCRUMB} />

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <div className="relative mt-6 mb-14 overflow-hidden rounded-3xl">
        <Image
          src="https://images.unsplash.com/photo-1536240478700-b869ad10e128?auto=format&fit=crop&w=1400&q=80"
          alt="How to train WAN 2.2 LoRA for AI video"
          width={1400}
          height={560}
          className="h-64 w-full object-cover opacity-30 sm:h-80"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/85 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
        <div className="absolute -right-10 top-0 h-56 w-56 rounded-full bg-blue-500/15 blur-3xl" />

        <div className="absolute inset-0 flex flex-col justify-center px-8 py-10">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="rounded-full bg-purple-500/15 border border-purple-500/20 px-2.5 py-0.5 text-xs font-semibold text-purple-300">Tutorial</span>
            <span className="text-xs text-white/30">9 min read · Updated April 2026</span>
            <span className="rounded-full bg-green-500/10 border border-green-500/20 px-2 py-0.5 text-xs font-semibold text-green-300">🎬 Video LoRA Guide</span>
          </div>
          <h1 className="text-2xl font-black leading-tight text-white sm:text-3xl lg:text-4xl">
            How to Train a WAN 2.2 LoRA
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-[#ff3e8a] bg-clip-text text-transparent">
              Complete Video LoRA Guide
            </span>
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/60 sm:text-base">
            WAN 2.2 is the most capable open-source AI video model. Train a LoRA to make your AI girlfriend appear consistently in every generated video.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {[{ label: '5 Steps', icon: '📋' }, { label: 'Video LoRA', icon: '🎬' }, { label: 'Beginner Friendly', icon: '🏆' }].map((s) => (
              <span key={s.label} className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/50">{s.icon} {s.label}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── What is WAN ───────────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">What Is WAN 2.2 and Why Train a LoRA for It?</h2>
        <div className="mt-4 mb-6 max-w-3xl space-y-3 text-sm leading-relaxed text-white/60">
          <p>
            WAN 2.2 is an advanced AI video generation model that creates smooth, high-quality video output from image inputs, text prompts, or reference video clips. Unlike image models, WAN 2.2 generates temporal sequences — your subject moves, animates, and exists across time.
          </p>
          <p>
            Training a LoRA for WAN 2.2 is the key to consistent video generation of a specific character. Without a LoRA, the model generates a generic person matching your description. With a trained LoRA, it generates your specific AI girlfriend or character — consistent face, features, and appearance — across every video.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: '🎭', title: 'Consistent Character Videos', desc: 'Your AI character maintains their unique appearance across all generated videos, not just still images.' },
            { icon: '💃', title: 'Motion + Identity Together', desc: 'The model learns both how your character looks AND how to animate them naturally in video.' },
            { icon: '🔓', title: 'NSFW Video Generation', desc: 'WAN 2.2 LoRAs enable consistent uncensored AI video featuring your virtual partner or AI girlfriend.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="group rounded-2xl border border-white/10 bg-[#12121a] p-5 transition-all hover:border-blue-500/30 hover:shadow-[0_0_20px_rgba(59,130,246,0.06)]">
              <span className="mb-3 block text-2xl">{icon}</span>
              <h3 className="font-bold text-white">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/50">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Step by step ──────────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">WAN 2.2 LoRA Training: Step-by-Step</h2>
        <p className="mt-2 mb-6 text-sm text-white/40">5 steps from dataset collection to generating videos of your character.</p>
        <div className="space-y-4">
          {STEPS.map(({ step, icon, title, content }) => (
            <div key={step} className="overflow-hidden rounded-2xl border border-white/10 bg-[#12121a] transition-all hover:border-blue-500/20">
              <div className="flex items-center gap-3 border-b border-white/5 px-6 py-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-sm font-black text-blue-400">{step}</span>
                <span className="text-lg">{icon}</span>
                <h3 className="font-bold text-white">{title}</h3>
              </div>
              <ul className="px-6 py-4 space-y-2">
                {content.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-white/60">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ── Mid article image ─────────────────────────────────────────────────── */}
      <div className="relative mb-14 overflow-hidden rounded-3xl">
        <Image
          src="https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1400&q=80"
          alt="AI video generation with WAN 2.2"
          width={1400}
          height={400}
          className="h-44 w-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] to-[#0a0a0f]/70" />
        <div className="absolute inset-0 flex items-center justify-between px-8">
          <div>
            <p className="text-lg font-black text-white sm:text-2xl">Your character. <span className="text-blue-400">In motion.</span></p>
            <p className="mt-1 text-sm text-white/50">WAN 2.2 LoRA brings your AI girlfriend to life in video.</p>
          </div>
          <Link href="/uncensored-ai-video-generator" className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-[#ff3e8a] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#ff3e8a]/30 transition hover:bg-[#ff3e8a]/90">
            Try Video Tools →
          </Link>
        </div>
      </div>

      {/* ── WAN vs image LoRA ─────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">WAN 2.2 LoRA vs Image LoRA — Key Differences</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[
            { icon: '🖼️', title: 'Image LoRA (Flux/SDXL)', points: ['Trained on static images only', 'Affects image generation only', 'Lighter on VRAM (12–24GB)', 'Faster training (20–60 min)', 'Best for: AI girlfriend photos & artwork'], color: 'border-purple-500/20 hover:border-purple-500/30' },
            { icon: '🎬', title: 'WAN 2.2 Video LoRA', points: ['Trained on video frames / clips', 'Affects video generation only', 'Heavy VRAM required (40GB+)', 'Training time: 30–120 min', 'Best for: AI girlfriend videos & animations'], color: 'border-blue-500/20 hover:border-blue-500/30' },
          ].map(({ icon, title, points, color }) => (
            <div key={title} className={`rounded-2xl border bg-[#12121a] p-5 transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.06)] ${color}`}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{icon}</span>
                <h3 className="font-bold text-white">{title}</h3>
              </div>
              <ul className="space-y-2">
                {points.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm text-white/60">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff3e8a]" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ── WAN vs competitors ────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">WAN 2.2 vs Competing AI Video Models</h2>
        <p className="mt-3 mb-6 text-sm text-white/40">How WAN 2.2 compares to the other major open-source AI video generation models for character LoRA training.</p>
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div className="grid grid-cols-4 border-b border-white/10 bg-white/5 px-5 py-3 text-xs font-semibold text-white/60">
            <span>Model</span>
            <span className="text-center text-blue-300">WAN 2.2</span>
            <span className="text-center">CogVideoX</span>
            <span className="text-center">AnimateDiff</span>
          </div>
          {[
            { feature: 'Video quality', wan: '⭐ Highest', cog: 'Good', anim: 'Moderate' },
            { feature: 'LoRA training support', wan: '✅ Full', cog: '⚠️ Limited', anim: '✅ Full' },
            { feature: 'NSFW generation', wan: '✅ Yes', cog: '❌ Filtered', anim: '✅ Yes' },
            { feature: 'VRAM required', wan: '40GB+', cog: '24GB+', anim: '12GB+' },
            { feature: 'Character consistency', wan: '⭐ Excellent', cog: 'Good', anim: 'Moderate' },
            { feature: 'Motion quality', wan: '⭐ Best', cog: 'Good', anim: 'Loop-focused' },
            { feature: 'Native resolution', wan: '480p–720p', cog: '480p', anim: '512px' },
          ].map(({ feature, wan, cog, anim }, i) => (
            <div key={feature} className={`grid grid-cols-4 items-center px-5 py-3 text-sm ${i % 2 === 0 ? 'bg-white/[0.02]' : ''}`}>
              <span className="text-white/70">{feature}</span>
              <span className="text-center font-medium text-blue-300">{wan}</span>
              <span className="text-center text-white/40">{cog}</span>
              <span className="text-center text-white/40">{anim}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tips for WAN quality ──────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">Tips for Higher Quality WAN 2.2 Video Output</h2>
        <div className="mt-4 max-w-3xl space-y-4 text-sm leading-relaxed text-white/60">
          <p>
            WAN 2.2 produces significantly better results when you understand how it processes temporal information. Unlike image models, video LoRAs need to capture not just what your character looks like but how they move — and the training data you provide directly determines this.
          </p>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[
            { icon: '🎬', title: 'Use video frames, not just photos', desc: 'Still photos work for a basic character LoRA, but short video clips (3–10 seconds of your character moving naturally) train WAN 2.2 to animate your character\'s unique motion patterns. Extract frames at 4–8 fps for best temporal coverage.' },
            { icon: '💃', title: 'Include motion diversity in training data', desc: 'Static poses train a static character. Include frames showing your character walking, turning their head, changing expression, and gesturing. Motion diversity translates directly to better video animation quality.' },
            { icon: '🔬', title: 'Lower LoRA weight for complex motion', desc: 'At LoRA weight 1.0, WAN 2.2 can over-constrain the identity and produce stiff, unnatural motion. For action scenes, reduce LoRA weight to 0.65–0.75. For static or portrait-style video, 0.85–0.9 preserves more identity.' },
            { icon: '⏱️', title: 'Keep generated videos short initially', desc: 'Start with 3–5 second generation targets. Longer videos (10–15s) amplify any consistency issues in the LoRA. Once 5-second results are solid, scale up to longer clips.' },
            { icon: '📐', title: 'Match training and generation resolution', desc: 'Train at 480p if you plan to generate at 480p. Training at 720p for 480p generation wastes training time. WAN 2.2 is resolution-specific — mismatches degrade quality.' },
            { icon: '🌡️', title: 'Use higher CFG scale for character fidelity', desc: 'WAN 2.2 generation with a CFG scale of 7–9 (vs the default 5–6) emphasises prompt adherence and character consistency. Pair with your trigger word for stronger LoRA activation.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="group rounded-2xl border border-white/10 bg-[#12121a] p-5 transition-all hover:border-blue-500/30 hover:shadow-[0_0_20px_rgba(59,130,246,0.05)]">
              <span className="mb-3 block text-2xl">{icon}</span>
              <h3 className="text-sm font-semibold text-white">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/50">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Common WAN issues ─────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">Common WAN 2.2 LoRA Training Issues</h2>
        <p className="mt-4 mb-6 max-w-3xl text-sm leading-relaxed text-white/60">
          WAN 2.2 training has a steeper hardware and setup bar than image LoRA training. These are the issues that most frequently block first attempts.
        </p>
        <div className="space-y-3">
          {[
            { issue: 'OOM (out of memory) during training', solution: 'WAN 2.2 requires 40GB VRAM minimum for comfortable training. On 24GB cards, reduce batch size to 1, frame count to 8, and use gradient checkpointing. Cloud compute (A100) is the most reliable path.' },
            { issue: 'Character face drifts mid-video', solution: 'Face drift means the LoRA didn\'t learn enough temporal consistency. Add more video frames to training data (especially head movement frames). Lower LoRA weight at generation to 0.65 reduces drift at the cost of some identity strength.' },
            { issue: 'Stiff, robot-like motion', solution: 'Usually caused by training on static images only. The model learned the face but has no motion reference. Supplement with 3–5 short video clips and retrain.' },
            { issue: 'Training completes but trigger word has no effect', solution: 'Check that captions include the trigger word and that the trigger word in generation prompts exactly matches training (case-sensitive). Also verify the LoRA is loading correctly — some inference tools have per-model LoRA weight settings that default to 0.' },
          ].map(({ issue, solution }) => (
            <div key={issue} className="overflow-hidden rounded-xl border border-blue-500/15 bg-[#12121a]">
              <div className="flex items-center gap-2 border-b border-white/5 bg-blue-500/5 px-4 py-2.5">
                <span className="text-sm text-blue-400">⚠</span>
                <p className="text-sm font-semibold text-white">{issue}</p>
              </div>
              <div className="flex items-start gap-2 px-4 py-3">
                <span className="text-sm text-green-400 shrink-0 mt-0.5">→</span>
                <p className="text-sm leading-relaxed text-white/50">{solution}</p>
              </div>
            </div>
          ))}
        </div>
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

      {/* ── Related Reading ───────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-xl font-bold text-white">Related Reading</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { title: 'FluxGym LoRA Training', desc: 'Train a Flux image LoRA — get your character consistent in photos before moving to video.', href: '/blog/fluxgym-lora-training', icon: '⚡' },
            { title: 'LoRA Training Hub', desc: 'Online LoRA training — no GPU required. Start training your character model in minutes.', href: '/lora-training', icon: '🧬' },
            { title: 'AI Girlfriend Generator', desc: 'Design your AI girlfriend and deploy your trained LoRA for consistent custom generations.', href: '/ai-girlfriend-generator', icon: '💕' },
          ].map(({ title, desc, href, icon }) => (
            <Link key={title} href={href} className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-[#12121a] p-4 transition-all hover:border-blue-500/40 hover:shadow-[0_0_15px_rgba(59,130,246,0.08)]">
              <span className="text-2xl shrink-0">{icon}</span>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-white/40">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── CTA ───────────────────────────────────────────────────────────────── */}
      <div className="relative mb-14 overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900/20 via-[#0a0f1a] to-[#0a0a1a] p-10 text-center">
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-[#ff3e8a]/20 blur-3xl" />
        <div className="relative z-10">
          <h2 className="text-2xl font-black text-white sm:text-3xl">Create AI Videos of Your Character</h2>
          <p className="mt-3 text-sm text-white/50">Use your trained LoRA with Veloura.ai&apos;s AI video tools — no restrictions.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/uncensored-ai-video-generator" className="inline-flex items-center gap-2 rounded-xl bg-[#ff3e8a] px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-[#ff3e8a]/30 transition hover:bg-[#ff3e8a]/90">
              Try AI Video Generator →
            </Link>
            <Link href="/blog/how-to-train-a-lora" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10">
              Image LoRA Guide
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
