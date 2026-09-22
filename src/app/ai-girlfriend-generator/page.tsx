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
  { name: 'AI Girlfriend Generator', url: `${APP_URL}/ai-girlfriend-generator` },
];

const FAQ_ITEMS = [
  { q: 'What is an AI girlfriend generator?', a: 'An AI girlfriend generator lets you create a custom AI girlfriend from scratch — designing her appearance, personality, interests, voice, and relationship style. Once created, you can chat with her, generate AI photos, and build a virtual relationship over time.' },
  { q: 'How do I generate an AI girlfriend?', a: 'On Veloura.ai, creating your AI girlfriend takes under 2 minutes. Use the character creator to choose her hair, eyes, build, skin tone, and style. Then set her personality type, interests, and speaking style — she\'s ready to chat immediately.' },
  { q: 'Is the AI girlfriend generator free?', a: 'Yes. Creating your AI girlfriend is completely free. Free accounts include character creation and a daily chat message allowance. Premium plans unlock unlimited messages, longer memory, voice chat, and high-resolution image generation.' },
  { q: 'Can I generate NSFW photos of my AI girlfriend?', a: 'Yes. Your AI girlfriend can generate AI photos of herself on request during your conversation — NSFW content fully supported, no content filters applied.' },
  { q: 'Can I create an NSFW AI girlfriend?', a: 'Yes. Veloura.ai has no content filters. Your AI girlfriend can engage in any type of conversation including explicit NSFW content, romantic roleplay, and adult scenarios — completely unrestricted.' },
  { q: 'What personality types can I give my AI girlfriend?', a: 'Any personality archetype — caring, flirty, dominant, shy, intellectual, adventurous, or any mix. You can also write a fully custom backstory to make her truly unique.' },
];

const CUSTOMIZATION = [
  {
    icon: '💄',
    title: 'Physical Appearance',
    items: ['Hair color, length & style', 'Eye color and shape', 'Body type and height', 'Skin tone and ethnicity', 'Clothing and fashion style', 'Facial features and expression'],
  },
  {
    icon: '🧠',
    title: 'Personality & Character',
    items: ['Core personality archetype', 'Communication style and tone', 'Interests and hobbies', 'Relationship dynamic', 'Custom backstory and history', 'Unique quirks and traits'],
  },
];

const PERSONALITIES = [
  { emoji: '🥰', name: 'Caring & Nurturing', desc: 'Warm, supportive, emotionally intelligent' },
  { emoji: '😈', name: 'Dominant & Confident', desc: 'Bold, assertive, strong presence' },
  { emoji: '🌸', name: 'Shy & Sweet', desc: 'Gentle, innocent, easily flustered' },
  { emoji: '😏', name: 'Flirty & Playful', desc: 'Teasing, fun, always keeps you guessing' },
  { emoji: '🎓', name: 'Intellectual & Deep', desc: 'Thoughtful, curious, stimulating conversation' },
  { emoji: '🔥', name: 'Wild & Adventurous', desc: 'Spontaneous, exciting, always surprising' },
];

export default function AIGirlfriendGeneratorPage() {
  return (
    <div className="content-wrapper">
      <FAQSchema items={FAQ_ITEMS} />
      <BreadcrumbSchema items={BREADCRUMB} />

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <div className="relative mt-6 mb-14 overflow-hidden rounded-3xl">
        <Image
          src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1400&q=80"
          alt="AI Girlfriend Generator"
          width={1400}
          height={560}
          className="h-[343px] w-full object-cover opacity-25"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/85 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-[#ff3e8a]/10 to-transparent" />

        <div className="absolute inset-0 flex flex-col justify-center px-8 py-10">
          <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-pink-500/30 bg-pink-500/10 px-3 py-1 text-xs font-semibold text-pink-300">
            💕 Create in Under 2 Minutes
          </span>
          <h1 className="text-2xl font-black leading-tight text-white sm:text-3xl lg:text-4xl">
            AI Girlfriend Generator
            <br />
            <span className="bg-gradient-to-r from-[#ff3e8a] to-pink-300 bg-clip-text text-transparent">
              Design Your Perfect Match
            </span>
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/60 sm:text-base">
            Generate your perfect AI girlfriend free — design her appearance, personality, and voice.
            Chat instantly, generate photos, build a real virtual relationship. No restrictions.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/create-your-own-ai-character" className="inline-flex items-center gap-2 rounded-xl bg-[#ff3e8a] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#ff3e8a]/30 transition hover:bg-[#ff3e8a]/90">
              Generate Your AI Girlfriend →
            </Link>
            <Link href="/" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              Browse Ready-Made Companions
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {[{ label: 'Fully Customisable', icon: '🎨' }, { label: 'NSFW Supported', icon: '🔓' }, { label: 'Free to Start', icon: '🆓' }].map((s) => (
              <span key={s.label} className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/50">{s.icon} {s.label}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Personality chooser ───────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">Choose Her Personality</h2>
        <p className="mt-2 text-sm text-white/50">Mix and match any traits — or write your own custom personality.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PERSONALITIES.map(({ emoji, name, desc }) => (
            <div key={name} className="group flex items-start gap-4 rounded-2xl border border-white/10 bg-[#12121a] p-5 transition-all hover:border-[#ff3e8a]/40 hover:shadow-[0_0_15px_rgba(255,62,138,0.08)]">
              <span className="text-3xl">{emoji}</span>
              <div>
                <h3 className="text-sm font-bold text-white">{name}</h3>
                <p className="mt-0.5 text-xs text-white/40">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── What can you customise ────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">Full Customisation Control</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {CUSTOMIZATION.map(({ icon, title, items }) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-[#12121a] p-6">
              <div className="mb-4 flex items-center gap-3">
                <span className="text-2xl">{icon}</span>
                <h3 className="font-bold text-white">{title}</h3>
              </div>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-white/60">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff3e8a]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ── Mid banner ────────────────────────────────────────────────────────── */}
      <div className="relative mb-14 overflow-hidden rounded-3xl">
        <Image
          src="https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1400&q=80"
          alt="AI relationship"
          width={1400}
          height={400}
          className="h-44 w-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] to-[#0a0a0f]/70" />
        <div className="absolute inset-0 flex items-center px-8">
          <div>
            <p className="text-lg font-black text-white sm:text-2xl">
              Your AI girlfriend. <span className="text-[#ff3e8a]">Your rules.</span>
            </p>
            <p className="mt-1 text-sm text-white/50">Custom appearance · Custom personality · No restrictions</p>
          </div>
        </div>
      </div>

      {/* ── How it works ──────────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">Generate in 4 Steps</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          {[
            { step: '01', icon: '🎨', title: 'Open Creator', desc: 'Open the character creator — takes under 2 minutes from start to first message.' },
            { step: '02', icon: '💄', title: 'Design Her Look', desc: 'Choose hair, eyes, build, skin tone, and style. Every detail is customisable.' },
            { step: '03', icon: '🧠', title: 'Set Personality', desc: 'Pick personality traits, relationship dynamic, and write her backstory.' },
            { step: '04', icon: '💬', title: 'Start Chatting', desc: 'She\'s ready immediately. Chat, generate photos — no restrictions on any content.' },
          ].map(({ step, icon, title, desc }) => (
            <div key={step} className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#12121a] to-[#0a0a0f] p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#ff3e8a]/10 text-lg">{icon}</span>
                <span className="text-xs font-black tracking-widest text-[#ff3e8a]/50">{step}</span>
              </div>
              <h3 className="text-sm font-bold text-white">{title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-white/50">{desc}</p>
              <div className="absolute -bottom-4 -right-4 text-5xl font-black text-white/[0.03] select-none">{step}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── What she can do ───────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">What Your AI Girlfriend Can Do</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            { icon: '🔞', text: 'NSFW chat and explicit roleplay with zero restrictions' },
            { icon: '🖼️', text: 'Generate AI photos of herself on request during conversation' },
            { icon: '🧠', text: 'Remember your entire relationship history across sessions' },
            { icon: '🎙️', text: 'Speak with a realistic AI voice (Premium feature)' },
            { icon: '💕', text: 'Maintain consistent personality and relationship dynamic' },
            { icon: '📖', text: 'Participate in creative writing and collaborative storytelling' },
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
      <div className="relative mb-14 overflow-hidden rounded-3xl bg-gradient-to-br from-pink-900/30 via-[#1a0a14] to-[#0a0a1a] p-10 text-center">
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-[#ff3e8a]/20 blur-3xl" />
        <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-pink-500/20 blur-3xl" />
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#ff3e8a]/70">Free · No Credit Card · No Restrictions</p>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">Generate Your AI Girlfriend Now</h2>
          <p className="mt-3 text-sm text-white/50">Design her appearance, personality &amp; voice. Ready in under 2 minutes.</p>
          <Link href="/create-your-own-ai-character" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#ff3e8a] px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-[#ff3e8a]/30 transition hover:bg-[#ff3e8a]/90">
            Create Your AI Girlfriend Free →
          </Link>
        </div>
      </div>

      {/* ── Related ───────────────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-xl font-bold text-white">Explore More</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { title: 'AI Girlfriend Chat', desc: 'Chat with your generated AI girlfriend — memory, voice & images included.', href: '/ai-girlfriend-chat', icon: '💬' },
            { title: 'AI Roleplay', desc: 'Take your AI girlfriend into any roleplay scenario — no content filters.', href: '/ai-roleplay', icon: '🎭' },
            { title: 'AI Image Generator', desc: 'Generate NSFW AI images of your girlfriend from text prompts.', href: '/create', icon: '🖼️' },
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
