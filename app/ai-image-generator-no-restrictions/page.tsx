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
  { name: 'AI Image Generator No Restrictions', url: `${APP_URL}/ai-image-generator-no-restrictions` },
];

const FAQ_ITEMS = [
  {
    q: 'What does "no restrictions" mean for an AI image generator?',
    a: 'An AI image generator with no restrictions processes every prompt without blocking, filtering, or refusing — regardless of the content. This means NSFW, explicit, adult, and mature themes are fully supported by default. There are no content policies, no blocked keywords, and no filtered outputs.',
  },
  {
    q: 'Can I generate explicit NSFW content with no restrictions?',
    a: 'Yes. Veloura.ai supports fully explicit and adult content from text prompts. No prompt is refused, no output is censored or blurred. Photorealistic, anime, fantasy, and any other style with any level of explicitness — all supported without restrictions.',
  },
  {
    q: 'Is the no-restrictions AI image generator free?',
    a: 'Yes. Veloura.ai is free to use with no credit card required. Free accounts generate images daily without sign-up barriers. Premium plans unlock unlimited generation, faster speeds, and higher resolution outputs.',
  },
  {
    q: 'How is "no restrictions" different from "no filter"?',
    a: '"No filter" typically refers to output filtering — whether generated images are blocked or censored after creation. "No restrictions" is broader: it means no prompt restrictions (nothing is blocked at input), no output filtering (results are never censored), and no platform-level policies that limit what you can generate. Veloura.ai has neither.',
  },
  {
    q: 'Do I need to sign up to use the unrestricted AI image generator?',
    a: 'No sign-up is required to start generating. You can create AI images immediately with no account. Creating a free account unlocks higher daily limits, saved history, and access to advanced tools like LoRA training and AI video generation.',
  },
];

const FEATURES = [
  { icon: '🚫', title: 'Zero Restrictions by Design', desc: 'Veloura.ai was built without a restriction layer from the ground up — not as a bypass, but as the default. Nothing is blocked at any stage.' },
  { icon: '⌨️', title: 'No Prompt Blocking', desc: 'Every prompt you type is processed as-is. No keyword filtering, no "policy violation" errors, no prompt rewriting — your words reach the model unchanged.' },
  { icon: '🔓', title: 'Unrestricted Output', desc: 'Generated images are never censored, blurred, or withheld. You receive exactly what the AI produces — every time, without post-processing restrictions.' },
  { icon: '🎨', title: 'All Content Types', desc: 'Photorealistic portraits, anime, hentai, explicit adult content, fantasy art, concepts — any style, any subject, any level of detail.' },
  { icon: '💧', title: 'No Watermark', desc: 'Download images without watermarks or branding. Your generations are yours, clean and ready to use.' },
  { icon: '🆓', title: 'Free to Start', desc: 'No credit card, no sign-up wall. Generate unrestricted AI images immediately — free tier available with daily generations.' },
];

const BLOCKED_ELSEWHERE = [
  { platform: 'DALL-E (ChatGPT)', blocks: 'All adult/NSFW content, explicit scenes, anything violating OpenAI policy' },
  { platform: 'Midjourney', blocks: 'Nudity, explicit content, most adult themes — even in paid tiers' },
  { platform: 'Adobe Firefly', blocks: 'All adult content, nudity, suggestive imagery — zero exceptions' },
  { platform: 'Stable Diffusion (hosted)', blocks: 'Varies — most hosted versions add content filters on top of the model' },
  { platform: 'Veloura.ai', blocks: 'Nothing. No restrictions at input or output.' },
];

export default function AIImageGeneratorNoRestrictionsPage() {
  return (
    <div className="content-wrapper">
      <FAQSchema items={FAQ_ITEMS} />
      <BreadcrumbSchema items={BREADCRUMB} />

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <div className="relative mt-6 mb-14 overflow-hidden rounded-3xl">
        <Image
          src="https://images.unsplash.com/photo-1655720828018-edd2daec9349?auto=format&fit=crop&w=1400&q=80"
          alt="AI image generator with no restrictions — generate anything"
          width={1400}
          height={560}
          className="h-[343px] w-full object-cover opacity-25"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/85 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
        <div className="absolute -right-10 top-0 h-56 w-56 rounded-full bg-purple-500/15 blur-3xl" />

        <div className="absolute inset-0 flex flex-col justify-center px-8 py-10">
          <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300">
            🚫 Generate Anything — Zero Restrictions
          </span>
          <h1 className="text-2xl font-black leading-tight text-white sm:text-3xl lg:text-4xl">
            AI Image Generator
            <br />
            <span className="bg-gradient-to-r from-purple-400 to-[#ff3e8a] bg-clip-text text-transparent">
              No Restrictions. No Limits.
            </span>
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/60 sm:text-base">
            The AI image generator built without restrictions from day one. Generate NSFW, explicit, and adult content
            from any text prompt — no blocked keywords, no censored outputs, no platform policies restricting your creativity.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/create" className="inline-flex items-center gap-2 rounded-xl bg-[#ff3e8a] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#ff3e8a]/30 transition hover:bg-[#ff3e8a]/90">
              Generate Images Free →
            </Link>
            <Link href="/ai-image-generator-no-filter" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              No-Filter Generator
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {[{ label: 'No Prompt Blocking', icon: '🚫' }, { label: 'No Output Filtering', icon: '🔓' }, { label: 'Free to Start', icon: '✅' }].map((s) => (
              <span key={s.label} className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/50">{s.icon} {s.label}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Why restrictions exist everywhere else ────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">Why Every Other Generator <span className="text-red-400">Has Restrictions</span></h2>
        <p className="mt-4 mb-6 text-sm leading-relaxed text-white/60 max-w-3xl">
          Major AI image generators — DALL-E, Midjourney, Adobe Firefly — enforce restrictions to comply with app store policies, payment processor terms, and brand risk management. Veloura.ai operates independently of these constraints, built specifically for users who need a truly unrestricted tool.
        </p>
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div className="grid grid-cols-2 border-b border-white/10 bg-white/5 px-5 py-3">
            <span className="text-xs font-semibold text-white/60">Platform</span>
            <span className="text-xs font-semibold text-white/60">What Gets Restricted</span>
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
        <h2 className="text-2xl font-bold text-white">Features of the Unrestricted AI Image Generator</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon, title, desc }) => (
            <div key={title} className="group rounded-2xl border border-white/10 bg-[#12121a] p-5 transition-all hover:border-purple-500/30 hover:shadow-[0_0_20px_rgba(168,85,247,0.06)]">
              <span className="mb-3 block text-3xl">{icon}</span>
              <h3 className="font-bold text-white">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/50">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── How it's different ────────────────────────────────────────────────── */}
      <div className="mb-14 rounded-3xl border border-white/10 bg-[#0f0f18] p-8">
        <h2 className="text-2xl font-bold text-white">Built Without Restrictions — Not Bypassing Them</h2>
        <p className="mt-4 text-sm leading-relaxed text-white/60 max-w-3xl">
          There's a critical difference between a generator that <em className="text-white/80">tries to bypass restrictions</em> and one that was <em className="text-white/80">built without them</em>. Most "unrestricted" tools are just jailbroken versions of restricted platforms — they can break, get patched, or still refuse certain prompts.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-white/60 max-w-3xl">
          Veloura.ai has no restriction layer to bypass. The platform runs models that were trained and deployed specifically for uncensored generation. There is no policy enforcement code, no keyword blocklist, no output classifier running in the background. Unrestricted generation isn't a mode — it's the only mode.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { label: 'No jailbreak needed', icon: '✅' },
            { label: 'No workarounds required', icon: '✅' },
            { label: 'No prompt rewriting', icon: '✅' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm font-medium text-white/70">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Mid banner ────────────────────────────────────────────────────────── */}
      <div className="relative mb-14 overflow-hidden rounded-3xl">
        <Image
          src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=80"
          alt="Unrestricted AI image generation"
          width={1400}
          height={400}
          className="h-44 w-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] to-[#0a0a0f]/70" />
        <div className="absolute inset-0 flex items-center justify-between px-8">
          <div>
            <p className="text-lg font-black text-white sm:text-2xl">Type it. <span className="text-purple-400">Generate it.</span> No restrictions.</p>
            <p className="mt-1 text-sm text-white/50">Any prompt. Any style. Any content. No restrictions ever.</p>
          </div>
          <Link href="/create" className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-[#ff3e8a] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#ff3e8a]/30 transition hover:bg-[#ff3e8a]/90">
            Generate Now →
          </Link>
        </div>
      </div>

      {/* ── What you can generate ─────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">What You Can Generate — Without Restrictions</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            { icon: '📸', text: 'Photorealistic portraits, full-body images, and intimate scenes with no content limits' },
            { icon: '🔞', text: 'Fully explicit NSFW and adult content from detailed text prompts, unrestricted' },
            { icon: '🎌', text: 'Anime, hentai, and manga-style illustrations — any content, any rating' },
            { icon: '✨', text: 'Fantasy, sci-fi, and concept art without subject-matter restrictions' },
            { icon: '👩', text: 'Custom AI girlfriend and companion images — any appearance, any scenario' },
            { icon: '🎨', text: 'Any artistic style, from hyperrealistic to stylised illustration, without limits' },
          ].map(({ icon, text }) => (
            <li key={text} className="flex items-start gap-3 rounded-xl border border-white/10 bg-[#12121a] px-4 py-3 transition-all hover:border-purple-500/20">
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
            { title: 'AI Image Generator No Filter', desc: 'Same unrestricted generation — explore the no-filter angle and compare tools.', href: '/ai-image-generator-no-filter', icon: '🖼️' },
            { title: 'AI Girlfriend Generator', desc: 'Design your perfect AI companion — appearance, personality, and voice — no restrictions.', href: '/ai-girlfriend-generator', icon: '💕' },
            { title: 'Uncensored AI Video Generator', desc: 'Generate uncensored AI videos from text or images. No content filters.', href: '/uncensored-ai-video-generator', icon: '🎬' },
          ].map(({ title, desc, href, icon }) => (
            <Link key={title} href={href} className="group flex items-start gap-4 rounded-2xl border border-white/10 bg-[#12121a] p-5 transition-all hover:border-purple-500/40 hover:shadow-[0_0_15px_rgba(168,85,247,0.08)]">
              <span className="text-2xl">{icon}</span>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-white/40">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── CTA ───────────────────────────────────────────────────────────────── */}
      <div className="relative mb-14 overflow-hidden rounded-3xl bg-gradient-to-br from-purple-500/20 via-[#1a0a1e] to-[#0a0a1a] p-10 text-center">
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-[#ff3e8a]/20 blur-3xl" />
        <div className="relative z-10">
          <h2 className="text-2xl font-black text-white sm:text-3xl">Generate Any Image — Zero Restrictions</h2>
          <p className="mt-3 text-sm text-white/50">Free to start. No credit card. No blocked prompts. No filtered outputs.</p>
          <Link href="/create" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#ff3e8a] px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-[#ff3e8a]/30 transition hover:bg-[#ff3e8a]/90">
            Start Generating Free →
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}