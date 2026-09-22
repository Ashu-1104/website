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
  title: 'How to Train a LoRA Model — Complete Beginner\'s Guide (2026) | Veloura.ai',
  description:
    'Step-by-step guide to training a LoRA model for your AI girlfriend or custom character. Covers dataset preparation, training parameters, and deployment — complete beginner walkthrough.',
  keywords: [
    'how to train a lora',
    'lora training',
    'train lora model',
    'lora training guide',
    'how to train lora model',
    'stable diffusion lora training',
    'custom lora model',
    'ai girlfriend lora training',
    'lora training tutorial',
  ],
  alternates: { canonical: `${APP_URL}/blog/how-to-train-a-lora` },
  openGraph: {
    title: 'How to Train a LoRA Model — Complete Beginner\'s Guide (2026)',
    description: 'Step-by-step LoRA training guide. From dataset prep to deployment — beginner-friendly walkthrough.',
    url: `${APP_URL}/blog/how-to-train-a-lora`,
    siteName: 'Veloura.ai',
    type: 'article',
  },
};

const BREADCRUMB = [
  { name: 'Home', url: APP_URL },
  { name: 'Blog', url: `${APP_URL}/blog` },
  { name: 'How to Train a LoRA Model', url: `${APP_URL}/blog/how-to-train-a-lora` },
];

const FAQ_ITEMS = [
  { q: 'What is a LoRA model?', a: 'LoRA (Low-Rank Adaptation) is a fine-tuning technique that trains a small adapter on top of an existing AI model. For image generation, a LoRA teaches the base model to consistently generate a specific subject — like your AI girlfriend or custom character — maintaining consistent appearance across all generated images.' },
  { q: 'How many images do I need to train a LoRA?', a: 'For a character LoRA, 15–30 high-quality images generally produces good results. Images should show the subject from different angles, lighting conditions, and expressions. More images (50–100) improve consistency but also increase training time.' },
  { q: 'How long does LoRA training take?', a: 'Training time depends on the tool and hardware. On Veloura.ai\'s online LoRA trainer, most character LoRAs complete in 20–60 minutes. Local training on a GPU can be faster but requires setup.' },
  { q: 'What base model should I use for my LoRA?', a: 'For photorealistic AI girlfriend/character LoRAs, SDXL-based models typically produce the best results. For anime-style characters, anime-specific base models work better. Veloura.ai supports both styles.' },
  { q: 'Can I train an NSFW LoRA?', a: 'Yes. Veloura.ai\'s LoRA trainer supports NSFW training datasets and NSFW outputs. The trained model can be used for uncensored image generation of your AI character.' },
];

const STEPS = [
  {
    step: '01',
    icon: '📁',
    title: 'Prepare Your Dataset',
    content: [
      'Collect 15–30 high-quality images of your subject (character, person, or AI character)',
      'Include variety: different angles (front, side, 3/4), different expressions, different lighting',
      'Avoid blurry, low-resolution, or heavily filtered images',
      'Crop images to focus on the face/subject — remove cluttered backgrounds where possible',
      'Target resolution: 512×512 or 768×768 minimum, 1024×1024 ideal',
    ],
  },
  {
    step: '02',
    icon: '✍️',
    title: 'Write Image Captions (Optional but Recommended)',
    content: [
      'Caption each image describing what it contains: "woman, brown hair, green eyes, smiling, outdoor lighting"',
      'Good captions help the model learn what features belong to your character vs what should be generalisable',
      'Keep captions consistent — use the same terms for the same features across images',
      'Include a trigger word in each caption: "mychr woman, brown hair..."',
    ],
  },
  {
    step: '03',
    icon: '🛠️',
    title: 'Choose Your Training Tool',
    content: [
      'Veloura.ai LoRA Trainer: Online, no GPU required, beginner-friendly, NSFW supported',
      'FluxGym: Web-based Flux LoRA trainer, good for Flux model variants',
      'Kohya_ss: Advanced local trainer, most control but requires technical setup',
      'SimpleTuner: Modern local trainer with good defaults for SDXL and Flux',
    ],
  },
  {
    step: '04',
    icon: '⚙️',
    title: 'Set Training Parameters',
    content: [
      'Training steps: 1,000–3,000 for most character LoRAs (more steps = more overfitting risk)',
      'Learning rate: 0.0001–0.0004 for most cases (lower = more stable training)',
      'LoRA rank: 32–64 for character training (higher rank = more capacity)',
      'Base model: Match to your intended output style (photorealistic vs anime)',
    ],
  },
  {
    step: '05',
    icon: '🔬',
    title: 'Train and Evaluate',
    content: [
      'Start training — on Veloura.ai this takes 20–60 minutes',
      'Test with varied prompts: "mychr woman at the beach", "mychr woman in red dress"',
      'Check for consistency: does the face look like your character across different scenes?',
      'If too generic (not enough of your character): increase steps or use more images',
      'If too rigid (identical in every generation): reduce steps or lower learning rate',
    ],
  },
  {
    step: '06',
    icon: '🚀',
    title: 'Deploy and Use Your LoRA',
    content: [
      'Your trained LoRA appears in your Veloura.ai model library',
      'Activate it during image generation by selecting it in the model picker',
      'Use your trigger word in prompts: "mychr woman in a fantasy forest"',
      'Adjust the LoRA weight (0.6–1.0) to balance character features with prompt flexibility',
    ],
  },
];

export default function HowToTrainLoRAPage() {
  return (
    <div className="content-wrapper">
      <FAQSchema items={FAQ_ITEMS} />
      <BreadcrumbSchema items={BREADCRUMB} />

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <div className="relative mt-6 mb-14 overflow-hidden rounded-3xl">
        <Image
          src="https://images.unsplash.com/photo-1555255707-c07966088b7b?auto=format&fit=crop&w=1400&q=80"
          alt="How to train a LoRA model tutorial"
          width={1400}
          height={560}
          className="h-64 w-full object-cover opacity-30 sm:h-80"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/85 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
        <div className="absolute -right-10 top-0 h-56 w-56 rounded-full bg-purple-500/15 blur-3xl" />

        <div className="absolute inset-0 flex flex-col justify-center px-8 py-10">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="rounded-full bg-purple-500/15 border border-purple-500/20 px-2.5 py-0.5 text-xs font-semibold text-purple-300">Tutorial</span>
            <span className="text-xs text-white/30">10 min read · Updated April 2026</span>
          </div>
          <h1 className="text-2xl font-black leading-tight text-white sm:text-3xl lg:text-4xl">
            How to Train a LoRA Model
            <br />
            <span className="bg-gradient-to-r from-purple-400 to-[#ff3e8a] bg-clip-text text-transparent">
              Complete Beginner&apos;s Guide
            </span>
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/60 sm:text-base">
            Train a custom LoRA for your AI girlfriend or character. From dataset preparation to deployment — no prior AI experience needed.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {[{ label: '6 Steps', icon: '📋' }, { label: 'No GPU Required', icon: '☁️' }, { label: 'NSFW Supported', icon: '🔓' }].map((s) => (
              <span key={s.label} className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/50">{s.icon} {s.label}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── What is LoRA ──────────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">What Is LoRA Training?</h2>
        <div className="mt-4 mb-6 max-w-3xl space-y-3 text-sm leading-relaxed text-white/60">
          <p>
            LoRA (Low-Rank Adaptation) is a technique that trains a small &quot;adapter&quot; file on top of an existing AI image model. Once trained, this adapter teaches the base model to consistently generate a specific person, character, or style.
          </p>
          <p>
            For AI girlfriend and character use cases, training a LoRA means your custom character will look the same in every image you generate — same face, same recognisable features, same style consistency — regardless of the scene, outfit, or setting you prompt.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: '😕', title: 'Before LoRA', desc: 'Each generated image of your character looks slightly different. Facial features are inconsistent between prompts.' },
            { icon: '✅', title: 'After LoRA Training', desc: 'Your character has a consistent, recognisable appearance in every generated image — scenes and poses vary but the person stays the same.' },
            { icon: '💡', title: 'Why It Matters', desc: 'Consistent characters feel more real. Your AI girlfriend becomes a genuinely persistent visual identity.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="group rounded-2xl border border-white/10 bg-[#12121a] p-5 transition-all hover:border-purple-500/30 hover:shadow-[0_0_20px_rgba(168,85,247,0.06)]">
              <span className="mb-3 block text-2xl">{icon}</span>
              <h3 className="text-sm font-bold text-white">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/50">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Step by step ──────────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">Step-by-Step LoRA Training Guide</h2>
        <p className="mt-2 mb-6 text-sm text-white/40">Follow these 6 steps to train your first character LoRA.</p>
        <div className="space-y-4">
          {STEPS.map(({ step, icon, title, content }) => (
            <div key={step} className="overflow-hidden rounded-2xl border border-white/10 bg-[#12121a] transition-all hover:border-purple-500/20">
              <div className="flex items-center gap-3 border-b border-white/5 px-6 py-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-lg font-black text-purple-400">{step}</span>
                <span className="text-lg">{icon}</span>
                <h3 className="font-bold text-white">{title}</h3>
              </div>
              <ul className="px-6 py-4 space-y-2">
                {content.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-white/60">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff3e8a]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ── Common mistakes ───────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">Common LoRA Training Mistakes — and How to Avoid Them</h2>
        <p className="mt-4 mb-6 max-w-3xl text-sm leading-relaxed text-white/60">
          Most first-time LoRA trainers hit the same set of problems. Understanding these before you start saves hours of re-training.
        </p>
        <div className="space-y-3">
          {[
            { mistake: 'Too few dataset images', fix: 'Under 10 images almost always produces poor results. The model doesn\'t have enough reference data to learn your character\'s consistent features. Aim for 15 minimum, 25+ for best results.' },
            { mistake: 'Low-quality or inconsistent images', fix: 'Blurry, heavily filtered, or stylistically inconsistent images confuse the model. Use clear, similarly-lit photos from multiple angles. A diverse set of 20 quality images beats 50 inconsistent ones.' },
            { mistake: 'Training too many steps', fix: 'Over-training causes the LoRA to "memorise" your images instead of learning features. The result: your character looks exactly right but only in poses matching the training data. Start at 1,500 steps and test — only increase if the character isn\'t recognisable.' },
            { mistake: 'Wrong trigger word', fix: 'Using a common English word as your trigger word (like "woman" or "character") will conflict with the model\'s existing knowledge. Use an unusual short token like "lnmchr" or "mywife24" that doesn\'t appear in normal prompts.' },
            { mistake: 'Not testing intermediate checkpoints', fix: 'The best LoRA is often not at the final training step. Save checkpoints at 500, 1000, and 1500 steps and test each one. The 1000-step checkpoint is frequently better than the 1500.' },
          ].map(({ mistake, fix }) => (
            <div key={mistake} className="overflow-hidden rounded-xl border border-red-500/15 bg-[#12121a]">
              <div className="flex items-center gap-2 border-b border-white/5 bg-red-500/5 px-4 py-2.5">
                <span className="text-sm text-red-400">✗</span>
                <p className="text-sm font-semibold text-white">{mistake}</p>
              </div>
              <div className="flex items-start gap-2 px-4 py-3">
                <span className="text-sm text-green-400 shrink-0 mt-0.5">✓</span>
                <p className="text-sm leading-relaxed text-white/50">{fix}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tips for best results ─────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">Tips for the Best LoRA Training Results</h2>
        <div className="mt-4 max-w-3xl space-y-4 text-sm leading-relaxed text-white/60">
          <p>
            Beyond avoiding mistakes, these techniques actively improve LoRA quality — especially for AI girlfriend and custom character models where facial consistency matters most.
          </p>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[
            { icon: '📐', title: 'Match base model to your use case', desc: 'For photorealistic AI girlfriend LoRAs, use a photorealistic SDXL base. For anime-style characters, use an anime-tuned base. Training a photorealistic LoRA on an anime base (or vice versa) produces a muddy, confused output.' },
            { icon: '🎯', title: 'Use diverse but focused datasets', desc: 'Diversity means different angles, lighting, and expressions — not different subjects. All images should be of the same person or character. Accidentally including a different person in even one image can corrupt the training.' },
            { icon: '✍️', title: 'Write precise captions', desc: 'Caption each image carefully: "lnmchr woman, long brown hair, green eyes, smiling, indoor lighting, portrait." Good captions teach the model what features belong to your character vs. the environment.' },
            { icon: '⚖️', title: 'Balance LoRA weight in generation', desc: 'A LoRA weight of 1.0 forces maximum character identity — useful for portraits. A weight of 0.7 balances identity with prompt flexibility, producing more varied scenes while keeping the face consistent.' },
            { icon: '🔄', title: 'Test with diverse generation prompts', desc: 'After training, test with: beach scene, formal outfit, different lighting, different expressions. A good LoRA maintains character identity across all of these. If it only looks right in similar conditions to training, reduce steps.' },
            { icon: '💾', title: 'Save your best checkpoints', desc: 'Keep multiple checkpoint files, not just the final one. Mark the checkpoint that produces your best generation results and use that one — re-training from scratch is expensive.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="group rounded-2xl border border-white/10 bg-[#12121a] p-5 transition-all hover:border-purple-500/30 hover:shadow-[0_0_20px_rgba(168,85,247,0.05)]">
              <span className="mb-3 block text-2xl">{icon}</span>
              <h3 className="text-sm font-semibold text-white">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/50">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Troubleshooting ───────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">Troubleshooting Poor LoRA Output</h2>
        <p className="mt-4 mb-6 max-w-3xl text-sm leading-relaxed text-white/60">
          If your trained LoRA isn&apos;t producing the results you want, diagnose it against these common patterns before deciding to re-train.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { symptom: 'Face looks generic — not like my character', cause: 'Too few training images or too low training steps', fix: 'Add more diverse images (aim for 20–30), increase steps by 500' },
            { symptom: 'Character looks right but scenes are stiff', cause: 'Over-training (too many steps)', fix: 'Test the 60–70% checkpoint — it\'s often better' },
            { symptom: 'Trigger word doesn\'t activate the LoRA', cause: 'Trigger word collides with base model vocabulary', fix: 'Rename trigger word to an unusual token, retrain with correct captions' },
            { symptom: 'Artefacts and distortion on face', cause: 'Dataset quality issue or learning rate too high', fix: 'Clean dataset (remove blurry/filtered images), lower learning rate by 30%' },
          ].map(({ symptom, cause, fix }) => (
            <div key={symptom} className="rounded-2xl border border-white/10 bg-[#12121a] p-4">
              <p className="text-sm font-semibold text-white mb-2">{symptom}</p>
              <p className="text-xs text-yellow-400/70 mb-1">Cause: {cause}</p>
              <p className="text-xs text-green-400/70">Fix: {fix}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Mid article image ─────────────────────────────────────────────────── */}
      <div className="relative mb-14 overflow-hidden rounded-3xl">
        <Image
          src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=80"
          alt="LoRA model training process"
          width={1400}
          height={400}
          className="h-44 w-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] to-[#0a0a0f]/70" />
        <div className="absolute inset-0 flex items-center justify-between px-8">
          <div>
            <p className="text-lg font-black text-white sm:text-2xl">Train online. <span className="text-purple-400">No GPU required.</span></p>
            <p className="mt-1 text-sm text-white/50">Veloura.ai handles the training infrastructure for you.</p>
          </div>
          <Link href="/lora-training" className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-[#ff3e8a] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#ff3e8a]/30 transition hover:bg-[#ff3e8a]/90">
            Start Training →
          </Link>
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
            { title: 'FluxGym LoRA Training', desc: 'Train a Flux LoRA using FluxGym — better quality, more photorealistic results than SDXL.', href: '/blog/fluxgym-lora-training', icon: '⚡' },
            { title: 'WAN 2.2 Video LoRA', desc: 'Train a LoRA for AI video generation — make your character appear in generated videos.', href: '/blog/how-to-train-wan-2-2-lora', icon: '🎬' },
            { title: 'AI Girlfriend Generator', desc: 'Design and generate your custom AI girlfriend — use your trained LoRA for consistent results.', href: '/ai-girlfriend-generator', icon: '💕' },
          ].map(({ title, desc, href, icon }) => (
            <Link key={title} href={href} className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-[#12121a] p-4 transition-all hover:border-purple-500/40 hover:shadow-[0_0_15px_rgba(168,85,247,0.08)]">
              <span className="text-2xl shrink-0">{icon}</span>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-white/40">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── CTA ───────────────────────────────────────────────────────────────── */}
      <div className="relative mb-14 overflow-hidden rounded-3xl bg-gradient-to-br from-purple-900/20 via-[#0f0a1a] to-[#0a0a1a] p-10 text-center">
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-[#ff3e8a]/20 blur-3xl" />
        <div className="relative z-10">
          <h2 className="text-2xl font-black text-white sm:text-3xl">Train Your AI Girlfriend LoRA Now</h2>
          <p className="mt-3 text-sm text-white/50">Online LoRA trainer — no GPU required, NSFW supported, free to start.</p>
          <Link href="/lora-training" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#ff3e8a] px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-[#ff3e8a]/30 transition hover:bg-[#ff3e8a]/90">
            Start LoRA Training →
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
