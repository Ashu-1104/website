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
  { name: 'Free NSFW AI Chat', url: `${APP_URL}/free-nsfw-ai-chat` },
];

const FAQ_ITEMS = [
  { q: 'Is NSFW AI chat really free?', a: 'Yes. Veloura.ai offers a generous free tier with no credit card required. Free accounts get a daily message allowance to chat with any AI companion — full NSFW content included. Premium plans unlock unlimited messages, longer memory, voice, and higher-resolution image generation.' },
  { q: 'Do I need to sign up to use free NSFW AI chat?', a: 'You can browse AI companions without signing up. To start chatting and save your conversation history, a free account takes under 60 seconds — no credit card, no subscription required.' },
  { q: 'Is the NSFW AI chat uncensored?', a: 'Yes. Veloura.ai has zero content filters. Your AI companion can engage in fully explicit, NSFW conversations — including roleplay, adult scenarios, and any topic — with no restrictions whatsoever.' },
  { q: 'What is the best free NSFW AI chat platform?', a: 'Veloura.ai is the leading free NSFW AI chat platform, combining uncensored conversation with AI image generation, voice cloning, and video creation in one place.' },
  { q: 'Can my AI companion generate photos?', a: 'Yes. Your AI companion can generate AI photos of themselves during your chat — photorealistic NSFW images generated instantly from your conversation.' },
  { q: 'Is there a limit to how explicit NSFW AI chat can be?', a: 'No. Veloura.ai imposes no content limits. Any topic, any scenario, any level of explicitness — fully supported natively, no jailbreaks needed.' },
];

const FEATURES = [
  { icon: '🆓', title: 'Completely Free to Start', desc: 'No credit card. No subscription. Start chatting immediately — free accounts include a daily message allowance with full NSFW content.' },
  { icon: '🔓', title: 'Zero Content Filters', desc: 'No blocked topics, no content moderation, no jailbreaks. Everything is allowed natively from your first message.' },
  { icon: '🖼️', title: 'AI Images in Chat', desc: 'Ask your AI companion to generate photos of themselves mid-conversation. Photorealistic NSFW images generated instantly.' },
  { icon: '🧠', title: 'Persistent Memory', desc: 'Your companion remembers your name, preferences, and relationship dynamic — building a real ongoing connection.' },
  { icon: '🎭', title: 'Custom Personality', desc: 'Design your companion\'s appearance and personality before your first message. She becomes exactly who you create.' },
  { icon: '🎙️', title: 'Voice Chat', desc: 'Hear your AI companion speak with a realistic neural voice. Voice cloning gives them a fully custom voice (Premium).' },
];

export default function FreeNSFWAIChatPage() {
  return (
    <div className="content-wrapper">
      <FAQSchema items={FAQ_ITEMS} />
      <BreadcrumbSchema items={BREADCRUMB} />

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <div className="relative mt-6 mb-14 overflow-hidden rounded-3xl">
        <Image
          src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1400&q=80"
          alt="Free NSFW AI Chat"
          width={1400}
          height={560}
          className="h-[343px] w-full object-cover opacity-30"
          priority
        />
        {/* gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
        {/* glowing orb */}
        <div className="absolute -right-20 top-0 h-64 w-64 rounded-full bg-[#ff3e8a]/20 blur-3xl" />

        <div className="absolute inset-0 flex flex-col justify-center px-8 py-10">
          {/* badge */}
          <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-[#ff3e8a]/30 bg-[#ff3e8a]/10 px-3 py-1 text-xs font-semibold text-[#ff3e8a]">
            ✦ Free &amp; Uncensored
          </span>
          <h1 className="text-2xl font-black leading-tight text-white sm:text-3xl lg:text-4xl">
            Free NSFW AI Chat
            <br />
            <span className="bg-gradient-to-r from-[#ff3e8a] to-[#ff8c42] bg-clip-text text-transparent">
              No Filters. No Limits.
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/60 sm:text-base">
            Chat with your AI companion completely free — uncensored, no credit card required.
            NSFW roleplay, explicit conversation &amp; AI image generation all included.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/create-your-own-ai-character"
              className="inline-flex items-center gap-2 rounded-xl bg-[#ff3e8a] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#ff3e8a]/30 transition hover:bg-[#ff3e8a]/90"
            >
              Start Free NSFW Chat →
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
            >
              Browse AI Companions
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {[
              { label: 'No Credit Card Required', icon: '💳' },
              { label: 'Zero Content Filters', icon: '🔓' },
              { label: 'Ready in 60 Seconds', icon: '⚡' },
            ].map((s) => (
              <span key={s.label} className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/50">
                {s.icon} {s.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Trust bar ─────────────────────────────────────────────────────────── */}
      <div className="mb-14 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: '✅', label: '100% Free to Start' },
          { icon: '🔓', label: 'Zero Content Filters' },
          { icon: '💳', label: 'No Credit Card Needed' },
          { icon: '⚡', label: 'Ready in 60 Seconds' },
        ].map(({ icon, label }) => (
          <div key={label} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#12121a] px-4 py-3">
            <span className="text-xl">{icon}</span>
            <span className="text-xs font-medium text-white/70">{label}</span>
          </div>
        ))}
      </div>

      {/* ── What is ───────────────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">
          What Is{' '}
          <span className="bg-gradient-to-r from-[#ff3e8a] to-[#ff8c42] bg-clip-text text-transparent">
            Free NSFW AI Chat?
          </span>
        </h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <p className="text-base leading-relaxed text-white/60">
            Free NSFW AI chat is uncensored AI conversation with no content restrictions —
            and zero cost to start. Unlike mainstream apps that filter explicit content or
            require paid subscriptions before anything meaningful happens, Veloura.ai
            gives you a genuinely free entry point with zero compromises on content.
          </p>
          <div className="overflow-hidden rounded-2xl">
            <Image
              src="https://images.unsplash.com/photo-1577563908411-5077b6dc7624?auto=format&fit=crop&w=800&q=80"
              alt="AI chat interface"
              width={800}
              height={450}
              className="h-48 w-full rounded-2xl object-cover opacity-60"
            />
          </div>
        </div>
      </div>

      {/* ── Features ──────────────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">Why Choose Veloura.ai?</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon, title, desc }) => (
            <li
              key={title}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#12121a] p-5 transition-all duration-300 hover:border-[#ff3e8a]/40 hover:shadow-[0_0_20px_rgba(255,62,138,0.1)]"
            >
              <span className="mb-3 block text-3xl">{icon}</span>
              <h3 className="text-sm font-bold text-white">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/50">{desc}</p>
              <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-[#ff3e8a]/5 transition-all group-hover:bg-[#ff3e8a]/10" />
            </li>
          ))}
        </ul>
      </div>

      {/* ── How to Start ──────────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">Get Started in 3 Steps</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { step: '01', icon: '👤', title: 'Create a Free Account', desc: 'Sign up in 60 seconds — no credit card, no subscription. Immediate access to NSFW AI chat.' },
            { step: '02', icon: '💫', title: 'Choose Your Companion', desc: 'Pick from hundreds of AI companions or create your own — set personality, appearance, and relationship dynamic.' },
            { step: '03', icon: '💬', title: 'Chat Without Filters', desc: 'Chat about anything — NSFW content, roleplay, explicit scenarios — zero restrictions from your first message.' },
          ].map(({ step, icon, title, desc }) => (
            <div
              key={step}
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#12121a] to-[#0a0a0f] p-6"
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ff3e8a]/10 text-xl">{icon}</span>
                <span className="text-xs font-black tracking-widest text-[#ff3e8a]/50">STEP {step}</span>
              </div>
              <h3 className="text-base font-bold text-white">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/50">{desc}</p>
              <div className="absolute -bottom-4 -right-4 text-6xl font-black text-white/[0.03] select-none">{step}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Mid-page image banner ─────────────────────────────────────────────── */}
      <div className="relative mb-14 overflow-hidden rounded-3xl">
        <Image
          src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=1400&q=80"
          alt="AI companion experience"
          width={1400}
          height={400}
          className="h-48 w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] to-[#0a0a0f]/70" />
        <div className="absolute inset-0 flex flex-col items-start justify-center px-8">
          <p className="max-w-lg text-lg font-bold text-white sm:text-2xl">
            Your AI companion. Your rules.{' '}
            <span className="text-[#ff3e8a]">No filters, ever.</span>
          </p>
          <Link
            href="/create-your-own-ai-character"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#ff3e8a] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#ff3e8a]/30 transition hover:bg-[#ff3e8a]/90"
          >
            Create Your Companion →
          </Link>
        </div>
      </div>

      {/* ── Free vs Premium ───────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">Free vs Premium</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[#12121a] p-6">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-2xl">🆓</span>
              <h3 className="text-lg font-bold text-white">Free Plan</h3>
            </div>
            <ul className="space-y-3">
              {[
                'Daily message allowance with your AI companion',
                'Full NSFW content — zero filters, zero restrictions',
                'Access to all AI companion personalities',
                'Basic AI image generation in chat',
                'No credit card required ever',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-white/60">
                  <span className="mt-0.5 text-green-400">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-[#ff3e8a]/30 bg-gradient-to-br from-[#ff3e8a]/5 to-[#12121a] p-6">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[#ff3e8a]/10 blur-2xl" />
            <div className="mb-4 flex items-center gap-2">
              <span className="text-2xl">⭐</span>
              <h3 className="text-lg font-bold text-white">Premium Plan</h3>
              <span className="rounded-full bg-[#ff3e8a]/10 px-2 py-0.5 text-xs font-semibold text-[#ff3e8a]">Most Popular</span>
            </div>
            <ul className="space-y-3">
              {[
                'Unlimited messages — no daily cap',
                'Extended conversation memory',
                'Voice chat with realistic AI voices',
                'High-resolution AI image generation',
                'Priority processing &amp; faster responses',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-white/60">
                  <span className="mt-0.5 text-[#ff3e8a]">✓</span>
                  <span dangerouslySetInnerHTML={{ __html: item }} />
                </li>
              ))}
            </ul>
            <Link
              href="/subscription"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#ff3e8a] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#ff3e8a]/20 transition hover:bg-[#ff3e8a]/90"
            >
              See Plans →
            </Link>
          </div>
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

      {/* ── CTA ───────────────────────────────────────────────────────────────── */}
      <div className="relative mb-14 overflow-hidden rounded-3xl bg-gradient-to-br from-[#ff3e8a]/20 via-[#1a0a14] to-[#0a0a1a] p-10 text-center">
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-[#ff3e8a]/20 blur-3xl" />
        <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#ff3e8a]/70">No Credit Card Required</p>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
            Start Free NSFW AI Chat Today
          </h2>
          <p className="mt-3 text-sm text-white/50">Join thousands of users already chatting without restrictions.</p>
          <Link
            href="/create-your-own-ai-character"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#ff3e8a] px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-[#ff3e8a]/30 transition hover:bg-[#ff3e8a]/90 hover:shadow-[#ff3e8a]/40"
          >
            Get Started Free →
          </Link>
        </div>
      </div>

      {/* ── Related ───────────────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-xl font-bold text-white">Explore More</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { title: 'AI Girlfriend Chat', desc: 'Chat with your custom AI girlfriend — memory, voice & images included.', href: '/ai-girlfriend-chat', icon: '💕' },
            { title: 'AI Roleplay', desc: 'Immersive uncensored AI roleplay — any character, any scenario.', href: '/ai-roleplay', icon: '🎭' },
            { title: 'Create AI Character', desc: 'Build your perfect companion from scratch — no restrictions.', href: '/create-your-own-ai-character', icon: '✨' },
          ].map(({ title, desc, href, icon }) => (
            <Link
              key={title}
              href={href}
              className="group flex items-start gap-4 rounded-2xl border border-white/10 bg-[#12121a] p-5 transition-all hover:border-[#ff3e8a]/40 hover:shadow-[0_0_15px_rgba(255,62,138,0.08)]"
            >
              <span className="mt-0.5 text-2xl">{icon}</span>
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
