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
  { name: 'AI Image Generator No Filter', url: `${APP_URL}/ai-image-generator-no-filter` },
];

const FAQ_ITEMS = [
  { q: 'What is an AI image generator with no filter?', a: 'An AI image generator with no filter creates images from text prompts without content restrictions. Unlike mainstream tools like DALL-E, Midjourney, or Adobe Firefly — which block NSFW and adult content — a no-filter AI image generator processes any prompt and returns the generated image without censoring, blurring, or refusing.' },
  { q: 'Is Veloura.ai\'s image generator really filter-free?', a: 'Yes. Veloura.ai was built without content filters from the start. No prompts are blocked, no outputs are filtered, and NSFW content works natively without jailbreaks or workarounds. This applies across all image generation tools on the platform.' },
  { q: 'Is the no-filter AI image generator free?', a: 'Yes. Veloura.ai is free to use with no credit card required. Free accounts can generate images daily. Premium plans unlock unlimited generation, higher resolution, and faster processing.' },
  { q: 'What styles can I generate with no filter?', a: 'You can generate photorealistic images, anime-style illustrations, fantasy art, portraits, landscapes, and explicit/NSFW content — all from text prompts. Any artistic style or subject matter is supported without restriction.' },
  { q: 'Do I need to download anything?', a: 'No. Veloura.ai is fully browser-based. You can generate filter-free AI images from any device — desktop, mobile, or tablet — without installing software or creating an account.' },
];

const FEATURES = [
  { icon: '🚫', title: 'Zero Prompt Blocking', desc: 'Type anything — your prompts are never refused, modified, or flagged. The AI processes exactly what you write.' },
  { icon: '🔓', title: 'No Output Filtering', desc: 'Generated images are never censored, blurred, or replaced. You get exactly what the AI produces — every time.' },
  { icon: '⚡', title: 'Instant Generation', desc: 'Results in seconds. No queue, no waiting, no "generation failed" errors caused by content filters.' },
  { icon: '🎨', title: 'All Styles Supported', desc: 'Photorealistic, anime, fantasy, portraits, NSFW — any art style, any subject, any level of detail.' },
  { icon: '💧', title: 'No Watermark', desc: 'Download your generated images without watermarks. Your creations are yours, without Veloura.ai branding.' },
  { icon: '🆓', title: 'Free to Start', desc: 'No credit card required. Generate images immediately — no sign-up barrier before your first creation.' },
];

const BLOCKED_ELSEWHERE = [
  { platform: 'DALL-E (ChatGPT)', blocks: 'All adult/NSFW content, explicit scenes, anything violating OpenAI policy' },
  { platform: 'Midjourney', blocks: 'Nudity, explicit content, most adult themes' },
  { platform: 'Adobe Firefly', blocks: 'All adult content, nudity, suggestive imagery' },
  { platform: 'Stable Diffusion Online', blocks: 'Varies — most hosted versions filter adult content' },
  { platform: 'Veloura.ai', blocks: 'Nothing. All content types supported.' },
];

export default function AIImageGeneratorNoFilterPage() {
  return (
    <div className="content-wrapper">
      <FAQSchema items={FAQ_ITEMS} />
      <BreadcrumbSchema items={BREADCRUMB} />

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <div className="relative mt-6 mb-14 overflow-hidden rounded-3xl">
        <Image
          src="https://images.unsplash.com/photo-1655720828018-edd2daec9349?auto=format&fit=crop&w=1400&q=80"
          alt="AI image generator with no filter"
          width={1400}
          height={560}
          className="h-[343px] w-full object-cover opacity-25"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/85 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
        <div className="absolute -right-10 top-0 h-56 w-56 rounded-full bg-[#ff3e8a]/15 blur-3xl" />

        <div className="absolute inset-0 flex flex-col justify-center px-8 py-10">
          <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-[#ff3e8a]/30 bg-[#ff3e8a]/10 px-3 py-1 text-xs font-semibold text-[#ff3e8a]">
            🖼️ Generate Anything — No Restrictions
          </span>
          <h1 className="text-2xl font-black leading-tight text-white sm:text-3xl lg:text-4xl">
            AI Image Generator
            <br />
            <span className="bg-gradient-to-r from-[#ff3e8a] to-orange-400 bg-clip-text text-transparent">
              No Filter. No Limits.
            </span>
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/60 sm:text-base">
            The only AI image generator that truly has no filter. Generate any image from text — NSFW, explicit, photorealistic —
            without blocked prompts, censored outputs, or content restrictions.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/create" className="inline-flex items-center gap-2 rounded-xl bg-[#ff3e8a] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#ff3e8a]/30 transition hover:bg-[#ff3e8a]/90">
              Generate Images Free →
            </Link>
            <Link href="/ai-apps" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              Browse AI Tools
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {[{ label: 'No Prompt Blocking', icon: '🚫' }, { label: 'No Output Filtering', icon: '🔓' }, { label: 'Free to Start', icon: '✅' }].map((s) => (
              <span key={s.label} className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/50">{s.icon} {s.label}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Why other generators have filters ────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">Why Most AI Image Generators <span className="text-red-400">Have Filters</span></h2>
        <p className="mt-4 mb-6 text-sm leading-relaxed text-white/60 max-w-3xl">
          Every major AI image platform — DALL-E, Midjourney, Adobe Firefly, Stable Diffusion online — enforces content filters that block adult and NSFW content. Veloura.ai was built from the ground up without these restrictions.
        </p>
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div className="grid grid-cols-2 border-b border-white/10 bg-white/5 px-5 py-3">
            <span className="text-xs font-semibold text-white/60">Platform</span>
            <span className="text-xs font-semibold text-white/60">What Gets Blocked</span>
          </div>
          {BLOCKED_ELSEWHERE.map(({ platform, blocks }, i) => (
            <div key={platform} className={`grid grid-cols-2 items-start gap-4 px-5 py-3 text-sm ${i % 2 === 0 ? 'bg-white/[0.02]' : ''} ${platform === 'Veloura.ai' ? 'border-t border-[#ff3e8a]/20 bg-[#ff3e8a]/5' : ''}`}>
              <span className={`font-medium ${platform === 'Veloura.ai' ? 'text-[#ff3e8a]' : 'text-white/70'}`}>{platform}</span>
              <span className={`text-xs leading-relaxed ${platform === 'Veloura.ai' ? 'font-semibold text-green-400' : 'text-white/40'}`}>{blocks}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ──────────────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">Features of the No-Filter AI Image Generator</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon, title, desc }) => (
            <div key={title} className="group rounded-2xl border border-white/10 bg-[#12121a] p-5 transition-all hover:border-[#ff3e8a]/30 hover:shadow-[0_0_20px_rgba(255,62,138,0.06)]">
              <span className="mb-3 block text-3xl">{icon}</span>
              <h3 className="font-bold text-white">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/50">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Mid banner ────────────────────────────────────────────────────────── */}
      <div className="relative mb-14 overflow-hidden rounded-3xl">
        <Image
          src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=80"
          alt="No filter AI image generation"
          width={1400}
          height={400}
          className="h-44 w-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] to-[#0a0a0f]/70" />
        <div className="absolute inset-0 flex items-center justify-between px-8">
          <div>
            <p className="text-lg font-black text-white sm:text-2xl">Type it. <span className="text-[#ff3e8a]">Generate it.</span> No filter.</p>
            <p className="mt-1 text-sm text-white/50">Any prompt. Any style. Any content. Instant results.</p>
          </div>
          <Link href="/create" className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-[#ff3e8a] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#ff3e8a]/30 transition hover:bg-[#ff3e8a]/90">
            Generate Now →
          </Link>
        </div>
      </div>

      {/* ── What you can generate ─────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">What You Can Generate</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            { icon: '📸', text: 'Photorealistic portraits and full-body images with no restrictions' },
            { icon: '🔞', text: 'Explicit NSFW and adult content from detailed text prompts' },
            { icon: '🎌', text: 'Anime, hentai, and illustrated styles with any content' },
            { icon: '✨', text: 'Fantasy, sci-fi, and concept art without theme limitations' },
            { icon: '👩', text: 'Custom AI girlfriend images — any appearance, any scenario' },
            { icon: '🎨', text: 'Any artistic style from photorealistic to stylised illustration' },
          ].map(({ icon, text }) => (
            <li key={text} className="flex items-start gap-3 rounded-xl border border-white/10 bg-[#12121a] px-4 py-3 transition-all hover:border-[#ff3e8a]/20">
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

      {/* ── Related ───────────────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-xl font-bold text-white">Related Tools</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { title: 'AI Image Editor', desc: 'Edit any image — no content restrictions. Face swap, background removal, upscaling.', href: '/ai-image-editor', icon: '✏️' },
            { title: 'Uncensored AI Generator', desc: 'Images, video, chat, voice — 6 tools with zero restrictions.', href: '/uncensored-ai-generator', icon: '🔓' },
            { title: 'AI Girlfriend Generator', desc: 'Design your perfect AI companion — appearance, personality, voice.', href: '/ai-girlfriend-generator', icon: '💕' },
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

      {/* ── CTA ───────────────────────────────────────────────────────────────── */}
      <div className="relative mb-14 overflow-hidden rounded-3xl bg-gradient-to-br from-[#ff3e8a]/20 via-[#1a0a14] to-[#0a0a1a] p-10 text-center">
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-[#ff3e8a]/20 blur-3xl" />
        <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative z-10">
          <h2 className="text-2xl font-black text-white sm:text-3xl">Generate Any Image — No Filter, No Limits</h2>
          <p className="mt-3 text-sm text-white/50">Free to start. No credit card. No content restrictions.</p>
          <Link href="/create" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#ff3e8a] px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-[#ff3e8a]/30 transition hover:bg-[#ff3e8a]/90">
            Start Generating Free →
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
