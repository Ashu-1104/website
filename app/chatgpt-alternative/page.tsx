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
  { name: 'ChatGPT Alternative', url: `${APP_URL}/chatgpt-alternative` },
];

const FAQ_ITEMS = [
  { q: 'Why do people look for ChatGPT alternatives?', a: 'ChatGPT enforces strict content policies that block NSFW content, explicit roleplay, adult image generation, and anything outside OpenAI\'s guidelines. Users looking for creative freedom, uncensored AI chat, or AI image generation without filters need a platform built without these restrictions.' },
  { q: 'Is Veloura.ai a free ChatGPT alternative?', a: 'Yes. Veloura.ai is completely free to start — no credit card, no sign-up hassle. Free accounts access all major AI tools including image generation, chat, and video creation. Premium plans unlock unlimited usage and higher resolution.' },
  { q: 'Can I generate NSFW images with this ChatGPT alternative?', a: 'Yes. Unlike ChatGPT and DALL-E which block all adult/NSFW image generation, Veloura.ai generates any image from text prompts without content restrictions. Explicit, adult, and NSFW content is fully supported.' },
  { q: 'Does this ChatGPT alternative have uncensored chat?', a: 'Yes. Veloura.ai\'s AI companion chat operates with zero content filters. You can have any conversation — romantic, explicit, roleplay — without the AI refusing or adding safety disclaimers.' },
  { q: 'What AI tools does this ChatGPT alternative include?', a: 'Veloura.ai includes: uncensored AI image generation (text-to-image, image-to-image), AI companion chat with no filters, AI video creation (deepfakes, kissing videos, motion transfer), AI voice cloning, AI image editing (face swap, background removal, upscaling), and LoRA model training.' },
  { q: 'Is Veloura.ai safe to use?', a: 'Veloura.ai is designed for adults (18+). The platform operates legally, handles user data responsibly, and provides a safe environment for adult AI content creation and interaction.' },
];

const COMPARISON = [
  { feature: 'NSFW image generation', chatgpt: false, us: true },
  { feature: 'Uncensored AI chat', chatgpt: false, us: true },
  { feature: 'Explicit roleplay', chatgpt: false, us: true },
  { feature: 'AI deepfake video', chatgpt: false, us: true },
  { feature: 'No content filters', chatgpt: false, us: true },
  { feature: 'Custom AI companion', chatgpt: false, us: true },
  { feature: 'AI voice cloning', chatgpt: false, us: true },
  { feature: 'LoRA model training', chatgpt: false, us: true },
  { feature: 'Free to start', chatgpt: true, us: true },
  { feature: 'Text generation', chatgpt: true, us: true },
];

const TOOLS = [
  { icon: '🖼️', title: 'Uncensored AI Images', desc: 'Generate any image from text — NSFW, explicit, photorealistic. No blocked prompts, no safe-mode outputs.', href: '/create', cta: 'Generate Images' },
  { icon: '💬', title: 'Uncensored AI Chat', desc: 'Chat with custom AI companions without filters. Any topic, any scenario, explicit content fully supported.', href: '/ai-girlfriend-chat', cta: 'Start Chatting' },
  { icon: '🎬', title: 'AI Video Creation', desc: 'Deepfake videos, AI kissing videos, motion transfer animations — all uncensored and restriction-free.', href: '/ai-video-generator', cta: 'Create Videos' },
  { icon: '✏️', title: 'AI Image Editor', desc: 'Edit any image — face swap, remove clothing, change backgrounds. 15+ uncensored AI editing tools.', href: '/ai-image-editor', cta: 'Edit Images' },
  { icon: '🎙️', title: 'AI Voice Cloning', desc: 'Clone any voice for your AI companion. Create custom audio with no content restrictions.', href: '/ai-audio/voice-cloning', cta: 'Clone Voice' },
  { icon: '🧬', title: 'LoRA Training', desc: 'Train a custom AI model on your character images. Consistent appearance across every generation.', href: '/lora-training', cta: 'Train Model' },
];

export default function ChatGPTAlternativePage() {
  return (
    <div className="content-wrapper">
      <FAQSchema items={FAQ_ITEMS} />
      <BreadcrumbSchema items={BREADCRUMB} />

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <div className="relative mt-6 mb-14 overflow-hidden rounded-3xl">
        <Image
          src="https://images.unsplash.com/photo-1677442135703-1787eea5ce01?auto=format&fit=crop&w=1400&q=80"
          alt="ChatGPT alternative uncensored AI"
          width={1400}
          height={560}
          className="h-[360px] w-full object-cover opacity-25"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/85 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
        <div className="absolute -right-10 top-0 h-56 w-56 rounded-full bg-[#ff3e8a]/15 blur-3xl" />

        <div className="absolute inset-0 flex flex-col justify-center px-8 py-10">
          <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-[#ff3e8a]/30 bg-[#ff3e8a]/10 px-3 py-1 text-xs font-semibold text-[#ff3e8a]">
            ✦ Everything ChatGPT Blocks — We Allow
          </span>
          <h1 className="text-2xl font-black leading-tight text-white sm:text-3xl lg:text-4xl">
            The Best ChatGPT Alternative
            <br />
            <span className="bg-gradient-to-r from-[#ff3e8a] to-orange-400 bg-clip-text text-transparent">
              Free, Uncensored, No Filters
            </span>
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/60 sm:text-base">
            ChatGPT blocks NSFW content, explicit chat, adult image generation, and anything outside OpenAI&apos;s policies.
            Veloura.ai does the opposite — zero content restrictions across every tool.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/create" className="inline-flex items-center gap-2 rounded-xl bg-[#ff3e8a] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#ff3e8a]/30 transition hover:bg-[#ff3e8a]/90">
              Try Free — No Sign Up →
            </Link>
            <Link href="/ai-girlfriend-chat" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              Start AI Chat
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {[{ label: 'No Content Filters', icon: '🔓' }, { label: 'Free to Start', icon: '✅' }, { label: '6 AI Tools', icon: '⚡' }].map((s) => (
              <span key={s.label} className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/50">{s.icon} {s.label}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Why ChatGPT isn't enough ──────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">Why Users Look for <span className="text-[#ff3e8a]">ChatGPT Alternatives</span></h2>
        <p className="mt-4 mb-6 text-sm leading-relaxed text-white/60 max-w-3xl">
          ChatGPT is a powerful language model — but OpenAI&apos;s content policy prevents it from doing the things many users actually want.
        </p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {[
            { icon: '🚫', text: 'Cannot generate NSFW or adult images (DALL-E is also heavily filtered)' },
            { icon: '🚫', text: 'AI chat refuses explicit roleplay and romantic conversations' },
            { icon: '🚫', text: 'No AI companion or girlfriend persona with persistent relationship' },
            { icon: '🚫', text: 'No AI video generation, deepfake tools, or motion transfer' },
            { icon: '🚫', text: 'No voice cloning for custom AI characters or companions' },
            { icon: '🚫', text: 'Content filters trigger unpredictably — even for mild adult topics' },
          ].map(({ icon, text }) => (
            <li key={text} className="flex items-start gap-3 rounded-xl border border-red-500/15 bg-[#12121a] px-4 py-3">
              <span className="shrink-0 text-red-400">{icon}</span>
              <span className="text-sm text-white/60">{text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Comparison table ──────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">ChatGPT vs Veloura.ai</h2>
        <p className="mt-2 mb-6 text-sm text-white/40">Side-by-side feature comparison.</p>
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div className="grid grid-cols-3 border-b border-white/10 bg-white/5 px-5 py-3">
            <span className="text-xs font-semibold text-white/60">Feature</span>
            <span className="text-center text-xs font-semibold text-white/40">ChatGPT</span>
            <span className="text-center text-xs font-semibold text-[#ff3e8a]">Veloura.ai</span>
          </div>
          {COMPARISON.map(({ feature, chatgpt, us }, i) => (
            <div key={feature} className={`grid grid-cols-3 items-center px-5 py-3 text-sm ${i % 2 === 0 ? 'bg-white/[0.02]' : ''}`}>
              <span className="text-white/70">{feature}</span>
              <span className="text-center text-lg">{chatgpt ? '✅' : '❌'}</span>
              <span className="text-center text-lg">{us ? '✅' : '❌'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tools grid ────────────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">6 AI Tools ChatGPT Doesn&apos;t Have</h2>
        <p className="mt-2 mb-6 text-sm text-white/40">Every tool is free to start — no content restrictions on any of them.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          alt="Uncensored AI platform"
          width={1400}
          height={400}
          className="h-44 w-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] to-[#0a0a0f]/70" />
        <div className="absolute inset-0 flex items-center justify-between px-8">
          <div>
            <p className="text-lg font-black text-white sm:text-2xl">ChatGPT says no. <span className="text-[#ff3e8a]">We say yes.</span></p>
            <p className="mt-1 text-sm text-white/50">Images · Chat · Video · Voice · LoRA Training</p>
          </div>
          <Link href="/create" className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-[#ff3e8a] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#ff3e8a]/30 transition hover:bg-[#ff3e8a]/90">
            Try Free →
          </Link>
        </div>
      </div>

      {/* ── What you can create ───────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">What You Can Create — That ChatGPT Won&apos;t Allow</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            { icon: '🔞', text: 'NSFW and adult AI images from any text prompt' },
            { icon: '💬', text: 'Uncensored AI chat — explicit conversations, zero refusals' },
            { icon: '👩', text: 'Custom AI girlfriend with unique appearance and personality' },
            { icon: '🎬', text: 'AI deepfake videos and intimate video generation' },
            { icon: '🎭', text: 'Unrestricted roleplay — any scenario, any character' },
            { icon: '🎙️', text: 'AI voice cloning for your companion characters' },
            { icon: '✏️', text: 'Image editing without content restrictions (face swap, etc.)' },
            { icon: '🧬', text: 'Train custom LoRA models on your AI character images' },
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

      {/* ── Related links ─────────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-xl font-bold text-white">Related Pages</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { title: 'Character AI Alternative', desc: 'No content filters, custom AI characters with full memory.', href: '/character-ai-alternative', icon: '🎭' },
            { title: 'Uncensored AI Generator', desc: 'Images, video, chat, voice — 6 tools, zero restrictions.', href: '/uncensored-ai-generator', icon: '🔓' },
            { title: 'Free NSFW AI Chat', desc: 'Chat with your AI companion — uncensored, free, no sign-up.', href: '/free-nsfw-ai-chat', icon: '💬' },
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
          <h2 className="text-2xl font-black text-white sm:text-3xl">Switch to the ChatGPT Alternative That Says Yes</h2>
          <p className="mt-3 text-sm text-white/50">Free to start. No credit card. No content restrictions.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/create" className="inline-flex items-center gap-2 rounded-xl bg-[#ff3e8a] px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-[#ff3e8a]/30 transition hover:bg-[#ff3e8a]/90">
              Start Free — No Sign Up →
            </Link>
            <Link href="/uncensored-ai-generator" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10">
              Explore All AI Tools
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
