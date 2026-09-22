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
  { name: 'Character AI Alternative', url: `${APP_URL}/character-ai-alternative` },
];

const FAQ_ITEMS = [
  { q: 'Why are people looking for a Character AI alternative?', a: 'Character.AI has heavy content filters that block NSFW and explicit content. Users find their roleplay conversations interrupted by filter warnings, characters breaking character with safety disclaimers, and romantic conversations being blocked. Many want the same experience — without the content restrictions.' },
  { q: 'What makes Veloura.ai the best Character AI alternative?', a: 'Veloura.ai has zero content filters — everything Character.AI blocks, we allow natively. Same customizable AI character experience with persistent memory, plus AI image generation, voice cloning, NSFW video creation, and LoRA model training.' },
  { q: 'Does Veloura.ai support NSFW like Character AI without filters?', a: 'Yes. Unlike Character.AI, Veloura.ai imposes no NSFW content restrictions. Your AI characters can engage in any type of conversation including explicit adult content, romantic roleplay, and uncensored scenarios.' },
  { q: 'Can I create the same type of AI characters as on Character AI?', a: 'Yes, with more control. Our character creator lets you design personality, backstory, appearance, and voice. Characters remember conversations across sessions and stay consistent — just like Character.AI but fully uncensored.' },
  { q: 'Is Veloura.ai free like Character AI?', a: 'Yes. Veloura.ai has a free tier with full NSFW content — no credit card required. Premium plans unlock unlimited messages, extended memory, voice, and image generation.' },
  { q: 'Can I import or recreate my Character AI characters?', a: 'You can quickly recreate your Character.AI characters in our creator — define the same personality, backstory, and traits. Your new character will be fully uncensored from the start.' },
];

const COMPARISON = [
  { feature: 'NSFW / Adult Content', characterAI: '❌ Blocked entirely', us: '✅ Fully supported' },
  { feature: 'Explicit Roleplay', characterAI: '❌ Characters break role with warnings', us: '✅ Native — no workarounds' },
  { feature: 'Custom AI Characters', characterAI: '✅ Personality & backstory', us: '✅ + Appearance, voice & LoRA' },
  { feature: 'AI Image Generation', characterAI: '❌ Not available', us: '✅ Mid-chat photo generation' },
  { feature: 'Voice Cloning', characterAI: '⚠️ Limited built-in voices', us: '✅ Full custom voice cloning' },
  { feature: 'AI Video Generation', characterAI: '❌ Not available', us: '✅ Deepfakes, kiss videos, motion' },
  { feature: 'Persistent Memory', characterAI: '✅ Basic', us: '✅ Extended (Premium)' },
  { feature: 'Free Tier', characterAI: '✅ With heavy filters', us: '✅ With zero content filters' },
  { feature: 'LoRA Model Training', characterAI: '❌ Not available', us: '✅ Train custom character models' },
];

export default function CharacterAIAlternativePage() {
  return (
    <div className="content-wrapper">
      <FAQSchema items={FAQ_ITEMS} />
      <BreadcrumbSchema items={BREADCRUMB} />

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <div className="relative mt-6 mb-14 overflow-hidden rounded-3xl">
        <Image
          src="https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&w=1400&q=80"
          alt="Character AI Alternative"
          width={1400}
          height={560}
          className="h-[343px] w-full object-cover opacity-25"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/85 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
        <div className="absolute -right-10 top-10 h-56 w-56 rounded-full bg-purple-500/20 blur-3xl" />

        <div className="absolute inset-0 flex flex-col justify-center px-8 py-10">
          <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300">
            🔓 No Content Filters
          </span>
          <h1 className="text-2xl font-black leading-tight text-white sm:text-3xl lg:text-4xl">
            Character AI Alternative
            <br />
            <span className="bg-gradient-to-r from-purple-400 to-[#ff3e8a] bg-clip-text text-transparent">
              Without the Restrictions
            </span>
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/60 sm:text-base">
            Everything Character.AI blocks — NSFW content, explicit roleplay, adult scenarios —
            Veloura.ai allows natively. Same AI characters. Zero filters. Free to start.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/create-your-own-ai-character"
              className="inline-flex items-center gap-2 rounded-xl bg-[#ff3e8a] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#ff3e8a]/30 transition hover:bg-[#ff3e8a]/90"
            >
              Create Your AI Character Free →
            </Link>
            <Link href="/" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              Browse Characters
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {[{ label: 'No Content Filters', icon: '🔓' }, { label: 'Better Than Character.AI', icon: '🏆' }, { label: 'Free to Start', icon: '✅' }].map((s) => (
              <span key={s.label} className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/50">
                {s.icon} {s.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Why people leave ──────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">
          Why Users Are Leaving{' '}
          <span className="text-white/40">Character.AI</span>
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <ul className="space-y-3">
            {[
              'NSFW and adult content fully blocked',
              'Characters add safety warnings mid-roleplay',
              'Romantic conversations get rerouted randomly',
              'No image generation capability at all',
              'No voice cloning for custom character voices',
              'No AI video creation tools',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 rounded-xl border border-red-500/10 bg-red-500/5 px-4 py-3 text-sm text-white/60">
                <span className="mt-0.5 shrink-0 text-red-400">✗</span>
                {item}
              </li>
            ))}
          </ul>
          <div className="relative overflow-hidden rounded-2xl">
            <Image
              src="https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&w=700&q=80"
              alt="AI character creation"
              width={700}
              height={450}
              className="h-full min-h-[200px] w-full rounded-2xl object-cover opacity-50"
            />
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-[#0a0a0f]/60">
              <div className="text-center">
                <p className="text-3xl font-black text-white">No Filters.</p>
                <p className="text-lg font-semibold text-[#ff3e8a]">Ever.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Comparison table ──────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">
          Full Feature Comparison
        </h2>
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03]">
                <th className="py-4 pl-5 text-left font-semibold text-white/50">Feature</th>
                <th className="py-4 px-3 text-left font-semibold text-white/30">Character.AI</th>
                <th className="py-4 px-3 text-left font-semibold text-[#ff3e8a]">Veloura.ai</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map(({ feature, characterAI, us }, i) => (
                <tr key={feature} className={`border-b border-white/5 ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                  <td className="py-3 pl-5 pr-3 font-medium text-white">{feature}</td>
                  <td className="py-3 px-3 text-white/40">{characterAI}</td>
                  <td className="py-3 px-3 font-medium text-white/80">{us}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── What we add ───────────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">
          What Veloura.ai Adds
          <span className="ml-2 text-[#ff3e8a]">Beyond Character.AI</span>
        </h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            { icon: '🖼️', text: 'Your AI character generates photos of themselves mid-conversation' },
            { icon: '🎙️', text: 'Voice cloning gives your character a completely custom AI voice' },
            { icon: '🎬', text: 'Create AI videos featuring your characters — deepfakes, animations' },
            { icon: '🧬', text: 'Train custom LoRA models for consistent character generation' },
            { icon: '🔗', text: 'Combine chat, images, video, and audio in one unified platform' },
            { icon: '🚫', text: 'No filter warnings, no broken immersion, no jailbreaks needed' },
          ].map(({ icon, text }) => (
            <li key={text} className="flex items-start gap-3 rounded-xl border border-[#ff3e8a]/10 bg-gradient-to-r from-[#ff3e8a]/5 to-transparent px-4 py-3">
              <span className="text-xl shrink-0">{icon}</span>
              <span className="text-sm text-white/70">{text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── How to switch ─────────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">Switch in 3 Steps</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { step: '01', icon: '⚡', title: 'Create a Free Account', desc: '60 seconds, no credit card. Immediate access to uncensored AI character chat.' },
            { step: '02', icon: '🎭', title: 'Recreate Your Characters', desc: 'Set personality, backstory, appearance, and voice — all in one creator, fully uncensored.' },
            { step: '03', icon: '🔓', title: 'Chat Without Restrictions', desc: 'No filter warnings, no characters breaking role, no blocked topics. Ever.' },
          ].map(({ step, icon, title, desc }) => (
            <div key={step} className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#12121a] to-[#0a0a0f] p-6">
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
      <div className="relative mb-14 overflow-hidden rounded-3xl bg-gradient-to-br from-purple-900/30 via-[#1a0a14] to-[#0a0a1a] p-10 text-center">
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-[#ff3e8a]/20 blur-3xl" />
        <div className="relative z-10">
          <h2 className="text-2xl font-black text-white sm:text-3xl">Switch to the Better Alternative</h2>
          <p className="mt-3 text-sm text-white/50">No filters, no restrictions, no broken immersion. Free to start.</p>
          <Link
            href="/create-your-own-ai-character"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#ff3e8a] px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-[#ff3e8a]/30 transition hover:bg-[#ff3e8a]/90"
          >
            Try Veloura.ai Free →
          </Link>
        </div>
      </div>

      {/* ── Related ───────────────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-xl font-bold text-white">Explore More</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { title: 'AI Roleplay', desc: 'Uncensored AI roleplay — no filter interruptions, full creative freedom.', href: '/ai-roleplay', icon: '🎭' },
            { title: 'AI Girlfriend Chat', desc: 'Chat with your AI girlfriend — uncensored, memory, voice & images.', href: '/ai-girlfriend-chat', icon: '💕' },
            { title: 'Create AI Character', desc: 'Design a fully custom AI character with appearance, personality & voice.', href: '/create-your-own-ai-character', icon: '✨' },
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
