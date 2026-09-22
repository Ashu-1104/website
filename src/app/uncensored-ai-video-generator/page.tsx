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
  { name: 'AI Video Generator', url: `${APP_URL}/ai-video-generator` },
  { name: 'Uncensored', url: `${APP_URL}/uncensored-ai-video-generator` },
];

const FAQ_ITEMS = [
  { q: 'What is an uncensored AI video generator?', a: 'An uncensored AI video generator creates AI-generated videos with no content restrictions — including NSFW and adult content. Unlike mainstream AI video tools that filter or block adult content, an uncensored AI video generator allows you to create any type of video.' },
  { q: 'Is the uncensored AI video generator free?', a: 'Yes. Veloura.ai offers free AI video generation with no credit card required. Free accounts can generate short AI videos. Premium plans unlock longer videos, higher resolution, and faster processing.' },
  { q: 'What types of uncensored AI videos can I create?', a: 'You can create deepfake face swap videos, AI kissing videos from two photos, NSFW motion transfer animations, AI stripe reveal videos, and generate videos from text prompts or reference images — all without content restrictions.' },
  { q: 'Can I create AI videos of my AI girlfriend or virtual partner?', a: 'Yes. Use your AI character images with any video generation tool — deepfake maker, kissing video generator, or motion transfer — to create videos featuring your virtual partner with no restrictions.' },
  { q: 'Are there any restrictions on what I can generate?', a: 'No. Veloura.ai has zero content restrictions on AI video generation. NSFW, adult, and explicit content is fully supported. No other platform offers this breadth of uncensored video tools.' },
  { q: 'How realistic is the uncensored AI video output?', a: 'Our AI video tools use state-of-the-art models for photorealistic face swapping and motion synthesis. Deepfake videos match skin tone, lighting, and facial angles automatically.' },
];

const VIDEO_TOOLS = [
  { icon: '🎭', title: 'NSFW Deepfake Video Maker', desc: 'Swap faces in any video with photorealistic accuracy. Supports all content types including adult videos — no restrictions.', href: '/ai-apps/deepfake-videos', label: 'Try Deepfake Maker' },
  { icon: '😘', title: 'AI Kissing Video Generator', desc: 'Generate intimate kissing videos from two face photos. AI synthesises a realistic video — fully uncensored, NSFW supported.', href: '/ai-apps/ai-kissing-video-creator', label: 'Try Kissing Video' },
  { icon: '🎬', title: 'AI Stripe Video Creator', desc: 'Create cinematic stripe reveal animations. Perfect for revealing AI character images in video format.', href: '/ai-apps/ai-stripe', label: 'Try Stripe Video' },
  { icon: '💃', title: 'Motion Transfer (NSFW)', desc: 'Transfer dance moves and motion onto your AI girlfriend or character. Bring virtual partners to life with realistic movement.', href: '/create/video/motion-transfer', label: 'Try Motion Transfer' },
  { icon: '✨', title: 'AI Video from Text/Image', desc: 'Generate entirely new AI videos from text prompts or reference images. No filming, no editing skills required.', href: '/create/video/generator', label: 'Try Video Generator' },
];

export default function UncensoredAIVideoGeneratorPage() {
  return (
    <div className="content-wrapper">
      <FAQSchema items={FAQ_ITEMS} />
      <BreadcrumbSchema items={BREADCRUMB} />

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <div className="relative mt-6 mb-14 overflow-hidden rounded-3xl">
        <Image
          src="https://images.unsplash.com/photo-1536240478700-b869ad10e128?auto=format&fit=crop&w=1400&q=80"
          alt="Uncensored AI Video Generator"
          width={1400}
          height={560}
          className="h-[343px] w-full object-cover opacity-30"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/85 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
        <div className="absolute -right-10 top-0 h-56 w-56 rounded-full bg-[#ff3e8a]/15 blur-3xl" />

        <div className="absolute inset-0 flex flex-col justify-center px-8 py-10">
          <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-300">
            🎬 The Only Uncensored AI Video Platform
          </span>
          <h1 className="text-2xl font-black leading-tight text-white sm:text-3xl lg:text-4xl">
            Uncensored AI
            <br />
            <span className="bg-gradient-to-r from-orange-400 to-[#ff3e8a] bg-clip-text text-transparent">
              Video Generator
            </span>
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/60 sm:text-base">
            Generate uncensored AI videos online free — no content restrictions, no watermark.
            Deepfakes, AI kissing videos, NSFW motion transfer. The only uncensored AI video platform.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/create/video" className="inline-flex items-center gap-2 rounded-xl bg-[#ff3e8a] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#ff3e8a]/30 transition hover:bg-[#ff3e8a]/90">
              Start Creating Videos Free →
            </Link>
            <Link href="/ai-apps" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              Browse All AI Tools
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {[{ label: 'No Content Restrictions', icon: '🔓' }, { label: 'Free to Start', icon: '✅' }, { label: 'No Watermark', icon: '🎨' }].map((s) => (
              <span key={s.label} className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/50">{s.icon} {s.label}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Why we're different ───────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">
          The Only Uncensored AI Video Platform
        </h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-sm leading-relaxed text-white/60">
              Every major AI video platform — Runway, Sora, Kling, Pika — enforces content
              policies that block NSFW and adult content. Veloura.ai is built differently:
              our AI video generation tools have <strong className="text-white">zero content restrictions</strong> by design.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-white/60">
              You can generate deepfake videos with any content, create intimate AI kissing videos,
              produce NSFW motion transfer animations, and build videos featuring your AI girlfriend
              or virtual partner — all without filters, blocked prompts, or content moderation.
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl">
            <Image
              src="https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=700&q=80"
              alt="AI video creation"
              width={700}
              height={400}
              className="h-48 w-full rounded-2xl object-cover opacity-60"
            />
          </div>
        </div>
      </div>

      {/* ── Video tools grid ──────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">Uncensored AI Video Tools</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {VIDEO_TOOLS.map(({ icon, title, desc, href, label }) => (
            <div key={title} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#12121a] p-5 transition-all hover:border-[#ff3e8a]/40 hover:shadow-[0_0_20px_rgba(255,62,138,0.1)]">
              <span className="mb-3 block text-3xl">{icon}</span>
              <h3 className="font-bold text-white">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/50">{desc}</p>
              <Link href={href} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#ff3e8a] hover:underline">
                {label} →
              </Link>
              <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-[#ff3e8a]/5 transition-all group-hover:bg-[#ff3e8a]/10" />
            </div>
          ))}
        </div>
      </div>

      {/* ── Use cases ─────────────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">What Can You Create?</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            { icon: '🎭', text: 'NSFW deepfake videos with photorealistic face swapping' },
            { icon: '😘', text: 'AI kissing videos — intimate scenes from two photos' },
            { icon: '💃', text: 'Motion transfer animations of your AI girlfriend or character' },
            { icon: '✨', text: 'Uncensored AI video from text prompts or reference images' },
            { icon: '🎬', text: 'Stripe reveal animations for AI character content' },
            { icon: '🔓', text: 'Virtual partner videos with zero content restrictions' },
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
      <div className="relative mb-14 overflow-hidden rounded-3xl bg-gradient-to-br from-orange-900/20 via-[#1a0a14] to-[#0a0a1a] p-10 text-center">
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-[#ff3e8a]/20 blur-3xl" />
        <div className="relative z-10">
          <h2 className="text-2xl font-black text-white sm:text-3xl">Create Uncensored AI Videos Free</h2>
          <p className="mt-3 text-sm text-white/50">No restrictions. No watermark. No editing skills needed.</p>
          <Link href="/create/video" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#ff3e8a] px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-[#ff3e8a]/30 transition hover:bg-[#ff3e8a]/90">
            Open AI Video Tools →
          </Link>
        </div>
      </div>

      {/* ── Related ───────────────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-xl font-bold text-white">Related Tools</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { title: 'AI Image Editor', desc: 'Edit any photo — remove objects, swap faces, change backgrounds.', href: '/ai-image-editor', icon: '✏️' },
            { title: 'AI Image Generator', desc: 'Generate NSFW AI images from text prompts — photorealistic results.', href: '/create', icon: '🖼️' },
            { title: 'All AI Tools', desc: '15+ AI image and video tools — face swap, upscaler, cloth swap, and more.', href: '/ai-apps', icon: '🛠️' },
          ].map(({ title, desc, href, icon }) => (
            <Link key={title} href={href} className="group flex items-start gap-4 rounded-2xl border border-white/10 bg-[#12121a] p-5 transition-all hover:border-[#ff3e8a]/40 hover:shadow-[0_0_15px_rgba(255,62,138,0.08)]">
              <span className="text-2xl">{icon}</span>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-[#ff3e8a] transition-colors">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-white/40">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
