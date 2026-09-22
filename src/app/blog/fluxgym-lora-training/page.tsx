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
  title: 'FluxGym LoRA Training — Step-by-Step Tutorial (2026) | Veloura.ai',
  description:
    'How to train a Flux LoRA model using FluxGym. Complete step-by-step tutorial for training your AI character, AI girlfriend, or custom subject model with Flux.',
  keywords: [
    'fluxgym lora training',
    'flux lora training',
    'fluxgym tutorial',
    'train flux lora',
    'flux lora model training',
    'fluxgym guide',
    'how to use fluxgym',
    'flux lora ai girlfriend',
  ],
  alternates: { canonical: `${APP_URL}/blog/fluxgym-lora-training` },
  openGraph: {
    title: 'FluxGym LoRA Training — Step-by-Step Tutorial (2026)',
    description: 'Complete FluxGym tutorial for training Flux LoRA models. Dataset prep, settings, and deployment walkthrough.',
    url: `${APP_URL}/blog/fluxgym-lora-training`,
    siteName: 'Veloura.ai',
    type: 'article',
  },
};

const BREADCRUMB = [
  { name: 'Home', url: APP_URL },
  { name: 'Blog', url: `${APP_URL}/blog` },
  { name: 'FluxGym LoRA Training', url: `${APP_URL}/blog/fluxgym-lora-training` },
];

const FAQ_ITEMS = [
  { q: 'What is FluxGym?', a: 'FluxGym is a web-based interface for training Flux LoRA models. It simplifies the LoRA training process for Flux (a modern AI image generation model) by providing a user-friendly UI that handles the technical training pipeline — making LoRA training accessible without deep technical knowledge.' },
  { q: 'Is FluxGym free?', a: 'FluxGym itself is an open-source project. Running it requires a capable GPU — either locally or via a cloud compute provider. For users who prefer a fully managed solution, Veloura.ai\'s online LoRA trainer handles the infrastructure for you.' },
  { q: 'What is the difference between Flux LoRA and SDXL LoRA?', a: 'Flux is a newer base model architecture that produces higher-quality, more photorealistic outputs than older SDXL models. Flux LoRAs tend to produce better character consistency and more natural-looking results, but require more VRAM to train and run.' },
  { q: 'How many images do I need for FluxGym LoRA training?', a: 'FluxGym LoRA training typically works well with 15–30 high-quality images of your subject. Flux is efficient at learning from small datasets, so quality matters more than quantity.' },
];

const STEPS = [
  {
    step: '01',
    icon: '💻',
    title: 'Set Up FluxGym',
    content: [
      'FluxGym is available as an open-source GitHub project for self-hosting',
      'For managed training without GPU setup, Veloura.ai\'s online trainer handles Flux LoRA training directly',
      'Local setup requires: 24GB+ VRAM GPU recommended (RTX 4090 or A100), Python environment, CUDA drivers',
      'Cloud options: Runpod, Vast.ai, or Google Colab (with high VRAM instance)',
    ],
  },
  {
    step: '02',
    icon: '📸',
    title: 'Prepare Your Dataset for Flux',
    content: [
      'Collect 15–30 clear, high-resolution images of your subject',
      'Resolution: 1024×1024 preferred for Flux (vs 512×512 for older models)',
      'Variety is key: different angles, lighting conditions, expressions, and backgrounds',
      'Avoid duplicate or near-duplicate images — diversity improves generalisation',
      'Crop tightly to your subject where possible, removing distracting backgrounds',
    ],
  },
  {
    step: '03',
    icon: '⚙️',
    title: 'Configure FluxGym Settings',
    content: [
      'Base model: Select your Flux variant (Flux.1-dev is recommended for character training)',
      'Training steps: 1,500–2,500 for 20-image datasets; scale up proportionally',
      'Learning rate: 0.0001–0.0002 (Flux trains well at lower rates than SDXL)',
      'LoRA rank: 16–32 for lightweight LoRAs; 64 for maximum character detail',
      'Caption method: Auto-captioning with trigger word prefix works well for Flux',
      'Trigger word: Choose a unique short token (e.g., "lnmchr") not in the base model vocabulary',
    ],
  },
  {
    step: '04',
    icon: '📊',
    title: 'Run Training and Monitor',
    content: [
      'Training typically takes 20–90 minutes depending on steps and hardware',
      'Monitor loss curves — should decrease steadily without sudden spikes',
      'FluxGym saves checkpoint LoRAs at intervals — test intermediate checkpoints if training is long',
      'Warning signs: loss plateaus early (increase learning rate) or loss spikes (decrease it)',
    ],
  },
  {
    step: '05',
    icon: '🧪',
    title: 'Test Your Flux LoRA',
    content: [
      'Load the finished LoRA in any Flux-compatible image generation tool',
      'Test prompt: "[trigger word] person standing in a park, natural lighting"',
      'Check: Does the face match your training images? Are unique features preserved?',
      'Test with varied styles and settings to verify generalisation',
      'Optimal LoRA weight for Flux: typically 0.7–0.9 (higher than SDXL LoRAs)',
    ],
  },
];

export default function FluxGymLoRAPage() {
  return (
    <div className="content-wrapper">
      <FAQSchema items={FAQ_ITEMS} />
      <BreadcrumbSchema items={BREADCRUMB} />

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <div className="relative mt-6 mb-14 overflow-hidden rounded-3xl">
        <Image
          src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=80"
          alt="FluxGym LoRA training tutorial"
          width={1400}
          height={560}
          className="h-64 w-full object-cover opacity-25 sm:h-80"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/85 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
        <div className="absolute -right-10 top-0 h-56 w-56 rounded-full bg-orange-500/15 blur-3xl" />

        <div className="absolute inset-0 flex flex-col justify-center px-8 py-10">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="rounded-full bg-purple-500/15 border border-purple-500/20 px-2.5 py-0.5 text-xs font-semibold text-purple-300">Tutorial</span>
            <span className="text-xs text-white/30">8 min read · Updated April 2026</span>
            <span className="rounded-full bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 text-xs font-semibold text-orange-300">⚡ Flux Architecture</span>
          </div>
          <h1 className="text-2xl font-black leading-tight text-white sm:text-3xl lg:text-4xl">
            FluxGym LoRA Training
            <br />
            <span className="bg-gradient-to-r from-orange-400 to-[#ff3e8a] bg-clip-text text-transparent">
              Step-by-Step Tutorial
            </span>
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/60 sm:text-base">
            The complete FluxGym tutorial — from dataset preparation to deploying your finished Flux LoRA model for AI character generation.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {[{ label: '5 Steps', icon: '📋' }, { label: 'Flux Architecture', icon: '⚡' }, { label: 'Best Quality', icon: '🏆' }].map((s) => (
              <span key={s.label} className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/50">{s.icon} {s.label}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── What is Flux ──────────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">What Is Flux and Why Train a Flux LoRA?</h2>
        <p className="mt-4 mb-6 max-w-3xl text-sm leading-relaxed text-white/60">
          Flux is a modern AI image generation architecture that produces significantly more photorealistic outputs than older Stable Diffusion models. Flux LoRAs benefit from this improved base quality — your trained character will look more natural and consistent than equivalent SDXL LoRAs.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { icon: '🎨', title: 'Better Base Quality', desc: 'Flux produces more photorealistic images out of the box, so your LoRA starts from a higher quality foundation.' },
            { icon: '🔄', title: 'Improved Consistency', desc: 'Flux LoRAs tend to maintain character features more consistently across varied prompts and settings.' },
            { icon: '🏗️', title: 'Modern Architecture', desc: 'Flux uses a diffusion transformer architecture that responds better to detailed prompts and complex scenes.' },
            { icon: '🌐', title: 'Growing Model Ecosystem', desc: 'An expanding library of Flux base models and community LoRAs makes it the current standard for high-quality character training.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="group rounded-2xl border border-white/10 bg-[#12121a] p-5 transition-all hover:border-orange-500/30 hover:shadow-[0_0_20px_rgba(249,115,22,0.06)]">
              <span className="mb-3 block text-2xl">{icon}</span>
              <h3 className="font-bold text-white">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/50">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── FluxGym Tutorial ──────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">FluxGym LoRA Training: Step-by-Step</h2>
        <p className="mt-2 mb-6 text-sm text-white/40">5 steps from setup to a fully trained Flux character LoRA.</p>
        <div className="space-y-4">
          {STEPS.map(({ step, icon, title, content }) => (
            <div key={step} className="overflow-hidden rounded-2xl border border-white/10 bg-[#12121a] transition-all hover:border-orange-500/20">
              <div className="flex items-center gap-3 border-b border-white/5 px-6 py-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-sm font-black text-orange-400">{step}</span>
                <span className="text-lg">{icon}</span>
                <h3 className="font-bold text-white">{title}</h3>
              </div>
              <ul className="px-6 py-4 space-y-2">
                {content.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-white/60">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ── Flux vs SDXL comparison ───────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">Flux LoRA vs SDXL LoRA — Which Should You Use?</h2>
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
          <div className="grid grid-cols-3 border-b border-white/10 bg-white/5 px-5 py-3 text-xs font-semibold text-white/60">
            <span>Feature</span>
            <span className="text-center text-orange-300">Flux LoRA</span>
            <span className="text-center text-white/40">SDXL LoRA</span>
          </div>
          {[
            { feature: 'Image quality', flux: '⭐ Highest', sdxl: 'Good' },
            { feature: 'Character consistency', flux: '⭐ Excellent', sdxl: 'Good' },
            { feature: 'VRAM required', flux: '24GB+', sdxl: '12GB+' },
            { feature: 'Training time', flux: '20–90 min', sdxl: '20–60 min' },
            { feature: 'Community models', flux: 'Growing fast', sdxl: 'Very large' },
            { feature: 'NSFW support', flux: '✅ Yes', sdxl: '✅ Yes' },
          ].map(({ feature, flux, sdxl }, i) => (
            <div key={feature} className={`grid grid-cols-3 items-center px-5 py-3 text-sm ${i % 2 === 0 ? 'bg-white/[0.02]' : ''}`}>
              <span className="text-white/70">{feature}</span>
              <span className="text-center font-medium text-orange-300">{flux}</span>
              <span className="text-center text-white/40">{sdxl}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── FluxGym vs other trainers ─────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">FluxGym vs Other Flux LoRA Trainers</h2>
        <p className="mt-3 mb-6 text-sm text-white/40">How FluxGym compares to the main alternatives for Flux LoRA training.</p>
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div className="grid grid-cols-4 border-b border-white/10 bg-white/5 px-5 py-3 text-xs font-semibold text-white/60">
            <span>Trainer</span>
            <span className="text-center">Setup difficulty</span>
            <span className="text-center">GPU required</span>
            <span className="text-center">Best for</span>
          </div>
          {[
            { name: 'Veloura.ai', diff: 'None (online)', gpu: '❌ Not needed', best: 'Beginners, NSFW' },
            { name: 'FluxGym', diff: 'Low–Medium', gpu: '24GB+ VRAM', best: 'Intermediate users' },
            { name: 'SimpleTuner', diff: 'Medium', gpu: '24GB+ VRAM', best: 'Advanced Flux training' },
            { name: 'Kohya_ss', diff: 'High', gpu: '12GB+ VRAM', best: 'SDXL + Flux, full control' },
            { name: 'Replicate / Modal', diff: 'Low', gpu: '❌ Cloud', best: 'API-based automation' },
          ].map(({ name, diff, gpu, best }, i) => (
            <div key={name} className={`grid grid-cols-4 items-center px-5 py-3 text-sm ${i % 2 === 0 ? 'bg-white/[0.02]' : ''} ${name === 'Veloura.ai' ? 'border-t border-[#ff3e8a]/20 bg-[#ff3e8a]/5' : ''}`}>
              <span className={`font-medium ${name === 'Veloura.ai' ? 'text-[#ff3e8a]' : 'text-white/70'}`}>{name}</span>
              <span className="text-center text-white/40 text-xs">{diff}</span>
              <span className="text-center text-white/40 text-xs">{gpu}</span>
              <span className="text-center text-white/40 text-xs">{best}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Advanced FluxGym tips ─────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">Advanced FluxGym Tips for Better Flux LoRA Results</h2>
        <div className="mt-4 max-w-3xl space-y-4 text-sm leading-relaxed text-white/60">
          <p>
            Once you&apos;ve completed your first FluxGym training run, these advanced techniques will significantly improve the quality and consistency of your Flux LoRA models — especially for AI character and AI girlfriend use cases where facial consistency is critical.
          </p>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[
            { icon: '🎯', title: 'Use Flux.1-dev, not Flux.1-schnell', desc: 'Flux.1-schnell is the fast distilled version — it trains and generates quicker, but produces lower quality LoRAs. For character training, always use Flux.1-dev as your base model despite the longer training time.' },
            { icon: '📊', title: 'Lower your learning rate for Flux', desc: 'Flux is more sensitive than SDXL. A learning rate of 0.0001 works well for SDXL but often causes artefacts on Flux. Start at 0.00008 and reduce to 0.00005 if you see distortion.' },
            { icon: '🖼️', title: 'Use 1024×1024 training images', desc: 'Flux was designed for 1024×1024 resolution. Using lower resolution training images (512px like SDXL setups) loses significant quality. Always prepare your dataset at 1024px before uploading to FluxGym.' },
            { icon: '✂️', title: 'Caption with DreamBooth-style prompts', desc: 'Write captions that describe unique features clearly: "[trigger] person, [specific facial features], [specific hair], [specific clothing if relevant]". Flux uses these descriptions more precisely than SDXL.' },
            { icon: '⚡', title: 'Test at multiple LoRA weights', desc: 'Flux LoRAs often need a weight of 0.8–0.9 to express character identity strongly. Test 0.6, 0.7, 0.8, 0.9, and 1.0 with the same prompt to find the optimal weight for your specific LoRA.' },
            { icon: '🔬', title: 'Save every 200 steps for comparison', desc: 'Set FluxGym checkpoint saving to every 200 steps. Generate a test image from each checkpoint with the same prompt. The optimal checkpoint is frequently not the final one — for 20-image datasets, 1,200–1,600 steps is often the sweet spot.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="group rounded-2xl border border-white/10 bg-[#12121a] p-5 transition-all hover:border-orange-500/30 hover:shadow-[0_0_20px_rgba(249,115,22,0.05)]">
              <span className="mb-3 block text-2xl">{icon}</span>
              <h3 className="text-sm font-semibold text-white">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/50">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Common FluxGym issues ─────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">Common FluxGym Issues and Solutions</h2>
        <p className="mt-4 mb-6 max-w-3xl text-sm leading-relaxed text-white/60">
          FluxGym is well-documented but a few issues trip up first-time users. These are the most common problems and their solutions.
        </p>
        <div className="space-y-3">
          {[
            { issue: 'CUDA out of memory', solution: 'Reduce batch size to 1, reduce gradient accumulation. If on 24GB VRAM, try LoRA rank 16 instead of 32. Cloud compute on A100 (40GB) avoids this entirely.' },
            { issue: 'LoRA trained but trigger word does nothing', solution: 'Check your caption files — the trigger word must appear in every caption, not just the config. Re-caption and retrain with the trigger word embedded in each image\'s text file.' },
            { issue: 'Generated face looks different each time', solution: 'Increase LoRA weight to 0.9 in your generation tool. If that doesn\'t help, the dataset needs more images from more angles — the model hasn\'t learned enough views of the face.' },
            { issue: 'Training loss is NaN after a few steps', solution: 'Learning rate is too high for your batch size. Reduce learning rate by 50% and restart. Also check that your images are valid — corrupt or grayscale images can cause NaN loss.' },
            { issue: 'FluxGym won\'t start / dependency errors', solution: 'Most FluxGym setup issues are Python environment problems. Use a fresh virtual environment, install requirements exactly as specified in the README, and ensure your CUDA version matches PyTorch.' },
          ].map(({ issue, solution }) => (
            <div key={issue} className="overflow-hidden rounded-xl border border-orange-500/15 bg-[#12121a]">
              <div className="flex items-center gap-2 border-b border-white/5 bg-orange-500/5 px-4 py-2.5">
                <span className="text-sm text-orange-400">⚠</span>
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
            { title: 'How to Train a LoRA', desc: 'The foundational LoRA training guide — covers SDXL, parameters, and beginner setup.', href: '/blog/how-to-train-a-lora', icon: '📚' },
            { title: 'WAN 2.2 Video LoRA', desc: 'Train a LoRA for AI video generation — your character in motion, not just photos.', href: '/blog/how-to-train-wan-2-2-lora', icon: '🎬' },
            { title: 'Generate Images', desc: 'Use your trained Flux LoRA to generate images — NSFW supported, no watermark.', href: '/create', icon: '🎨' },
          ].map(({ title, desc, href, icon }) => (
            <Link key={title} href={href} className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-[#12121a] p-4 transition-all hover:border-orange-500/40 hover:shadow-[0_0_15px_rgba(249,115,22,0.08)]">
              <span className="text-2xl shrink-0">{icon}</span>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-orange-400 transition-colors">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-white/40">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── CTA ───────────────────────────────────────────────────────────────── */}
      <div className="relative mb-14 overflow-hidden rounded-3xl bg-gradient-to-br from-orange-900/20 via-[#1a0f0a] to-[#0a0a1a] p-10 text-center">
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-[#ff3e8a]/20 blur-3xl" />
        <div className="relative z-10">
          <h2 className="text-2xl font-black text-white sm:text-3xl">Train Your LoRA Without the Setup Hassle</h2>
          <p className="mt-3 text-sm text-white/50">Veloura.ai handles Flux LoRA training online — no GPU, no setup, NSFW supported.</p>
          <Link href="/lora-training" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#ff3e8a] px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-[#ff3e8a]/30 transition hover:bg-[#ff3e8a]/90">
            Try Online LoRA Training →
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
