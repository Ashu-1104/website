// Force dynamic rendering — homepage fetches from DB at runtime, not build time
export const revalidate = 3600; // ISR — rebuild homepage every hour

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  MessageCircle,
  Video,
  Mic,
  Zap,
  AppWindow,
  Headphones,
  AudioLines,
  Sparkles,
  Globe,
  Shield,
  Music,
  Copy,
  Volume2,
  X,
  ChevronRight,
  Edit3,
  Wand2,
  Film,
  Layers,
  Brain,
  Infinity as InfinityIcon,
  Flame,
  Rocket,
  Star,
  Palette,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { SidebarProvider } from '@/context/SidebarContext';
import FAQSchema from '@/components/seo/FAQSchema';
import HeroCardSwiper from '@/components/hero/HeroCardSwiper';
import Reveal from '@/components/home/Reveal';
import LoraGallery from '@/components/home/LoraGallery';
import VideoRotator from '@/components/home/VideoRotator';
import { prisma } from '@/lib/db';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

export const metadata: Metadata = {
  title: 'Veloura.ai — AI Girlfriend, NSFW Image & Video Generator, AI Image Editor',
  description:
    'The all-in-one uncensored AI platform. Create an AI girlfriend with memory, generate NSFW images with Flux, SDXL, Pony & Illustrious, produce AI video, edit images and train your own LoRA — zero filters, free to start.',
  keywords: [
    'AI girlfriend', 'AI relationship bots', 'AI companion', 'AI girlfriend app',
    'virtual girlfriend', 'nsfw ai chat', 'AI boyfriend', 'AI companion app',
    'AI image editor', 'AI roleplay', 'uncensored AI chat', 'AI girlfriend generator',
    'create AI girlfriend', 'virtual partner', 'AI virtual girlfriend', 'best AI girlfriend app',
    'AI girlfriend free', 'AI girlfriend no filter', 'AI girlfriend no restrictions',
    'free AI girlfriend', 'NSFW character AI', 'uncensored ai', 'ai uncensored',
    'free uncensored smart ai', 'dream companion ai', 'uncensored ai image generator',
    'AI girlfriend chat', 'AI girlfriend with voice', 'AI girlfriend with memory',
    'NSFW AI roleplay', 'AI relationship app', 'AI dating', 'romance AI', 'AI love',
    'custom AI companion', 'personalized AI companion', 'realistic AI companion',
    'AI virtual partner app', 'flirt with AI', 'character AI alternative', 'ai girlfriend nudes',
    'SDXL nsfw', 'Pony diffusion', 'Flux image generation', 'Illustrious model',
    'LoRA training', 'AI video generator', 'AI deepfake', 'AI face swap',
  ],
  alternates: { canonical: APP_URL },
  openGraph: {
    title: 'Veloura.ai — AI Girlfriend, NSFW Image & Video Generator, AI Image Editor',
    description: 'Create an AI girlfriend with memory. Generate uncensored images & video with Flux, SDXL, Pony & Illustrious. Train your own LoRA. Zero filters. Free to start.',
    url: APP_URL,
    siteName: 'Veloura.ai',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Girlfriend | NSFW Image & Video | AI Image Editor — Veloura.ai',
    description: 'The uncensored AI platform: AI girlfriend, NSFW image & video, Flux/SDXL/Pony/Illustrious, LoRA training. Free to start.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
};

const FAQ_ITEMS = [
  {
    q: 'What is an AI girlfriend?',
    a: 'An AI girlfriend is a virtual companion powered by artificial intelligence that you can chat with, build a relationship with, and interact with through text, voice, and images. Unlike basic chatbots, AI girlfriends on Veloura.ai remember your conversations, develop a personality and respond with genuine emotion and context.',
  },
  {
    q: 'What is an AI companion?',
    a: 'An AI companion is a personalised AI character designed for ongoing conversation, emotional connection and creative interaction. AI companions can take many forms — AI girlfriend, AI boyfriend, virtual partner or custom AI character — each with their own personality, appearance and voice.',
  },
  {
    q: 'How do I create an AI girlfriend on Veloura.ai?',
    a: "Creating your AI girlfriend takes under 2 minutes. Visit the Create page, choose your character's appearance (hair, eyes, body type, clothing style), set her personality traits and interests, and optionally add a custom voice. Your AI girlfriend is immediately ready to chat with no restrictions.",
  },
  {
    q: 'Which AI image models do you support?',
    a: 'We run the most capable open-source models — Flux, SDXL, Pony Diffusion and Illustrious — fully uncensored. You can switch models per-generation, fine-tune with your own LoRA weights and output up to 4K photorealistic results without watermarks.',
  },
  {
    q: 'Can I train my own LoRA model?',
    a: 'Yes. Upload 10–30 reference images of any character, face or style and our LoRA training pipeline produces a custom model in minutes. Every future generation renders your subject with perfect consistency — same face, same look, every time.',
  },
  {
    q: 'Is Veloura.ai free?',
    a: 'Yes, Veloura.ai is free to start. You can create an AI girlfriend, start chatting and generate images at no cost. Premium plans unlock unlimited messages, longer memory, voice features, video generation and higher resolution image outputs.',
  },
  {
    q: 'How is Veloura.ai different from Character.AI?',
    a: 'Veloura.ai is fully uncensored with no content filters — unlike Character.AI which blocks NSFW content. Our platform also combines AI chat with image generation, voice cloning, video creation and AI image editing tools in one place, making it a complete AI companion platform rather than just a chat app.',
  },
  {
    q: 'Is my data safe and private on Veloura.ai?',
    a: 'Yes. Your conversations and generated content are private. We do not share your personal data or chat history with third parties. See our privacy policy for full details on how your data is handled and stored.',
  },
];

// Community gallery — top row (15) + bottom row (14)
const COMMUNITY_IMAGES_ROW_1 = [
  'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/communityImages/UncensoredArt1.png',
  'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/communityImages/UncensoredArt2.png',
  'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/communityImages/UncensoredArt3.jpeg',
  'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/communityImages/UncensoredArt4.png',
  'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/communityImages/UncensoredArt5.png',
  'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/communityImages/UncensoredArt6.jpeg',
  'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/communityImages/UncensoredArt7.jpeg',
  'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/communityImages/UncensoredArt8.png',
  'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/communityImages/UncensoredArt9.png',
  'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/communityImages/UncensoredArt10.png',
  'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/communityImages/UncensoredArt11.jpeg',
  'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/communityImages/UncensoredArt13.webp',
  'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/communityImages/UncensoredArt14.jpeg',
  'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/communityImages/UncensoredArt15.png',
];

const COMMUNITY_IMAGES_ROW_2 = [
  'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/communityImages/UncensoredArt16.webp',
  'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/communityImages/UncensoredArt17.jpg',
  'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/communityImages/UncensoredArt20.jpeg',
  'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/communityImages/UncensoredArt21.jpeg',
  'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/communityImages/UncensoredArt22.jpeg',
  'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/communityImages/UncensoredArt23.jpeg',
  'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/communityImages/UncensoredArt24.webp',
  'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/communityImages/UncensoredArt19.webp',
  'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/communityImages/UncensoredArt25.jpeg',
  'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/communityImages/UncensoredArt27.jpeg',
  'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/communityImages/UncensoredArt29.jpg',
  'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/communityImages/UncensoredArt30.jpeg',
  'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/communityImages/UncensoredArt31.webp',
];

export default async function HomePage() {
  const AI_COMPANION_NAMES = [
    'Peach Monroe',
    'Lila Voss',
    'Elle',
    'Sarah-Louise Dahl',
    'Bianca Mallory',
    'Cindy',
    'Jill',
    'Lena Whitmore',
    'Maddie Collins',
    'Sofia Delacruz',
    'Rachel Knox',
    'Fiona Hart - The Impossible Pregnancy',
    'Katie King',
    'Sophie Bennett',
    'Alexis Watson "NTR"',
    'Jess - "Game Day"',
    'Iris',
    'Jane',
    'Dolores',
    'Lola Stewart',
    'Kristen Lee',
  ];

  let heroCharactersRaw: Array<{ id: string; name: string; characterAvatarUrl: string | null; gender: string | null; style: string | null }> = [];
  try {
    heroCharactersRaw = await prisma.aICharacter.findMany({
      where: { name: { in: AI_COMPANION_NAMES }, characterAvatarUrl: { not: null } },
      select: { id: true, name: true, characterAvatarUrl: true, gender: true, style: true },
    });
  } catch {
    // The public landing page remains usable before the optional community schema is provisioned.
  }

  // Preserve the order specified above
  const heroCharacters = AI_COMPANION_NAMES
    .map((name) => heroCharactersRaw.find((c) => c.name === name))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  // Curated LoRA showcase images (supplied by the user).
  const loraGalleryImages: string[] = [
    'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/characters/zoey-goddess-y3fmu6lbnz/0.jpg',
    'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/landingPageLoraImage1.png',
    'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/landingPageLoraImage2.png',
    'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/landingPageLoraImage3.png',
    'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/landingPageLoraImage4.png',
    'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/landingPageLoraImage5.png',
    'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/landingPageLoraImage6.png',
    'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/landingPageLoraImage7.png',
  ];

  return (
    <SidebarProvider>
      <div className="app-layout">
        <Sidebar />
        <Header />
        <main className="main-content">
          <FAQSchema items={FAQ_ITEMS} />
          <div className="content-wrapper">

            {/* ═══════════════════════════════════════════════════════════════
                HERO — cinematic split with animated mesh background
            ═══════════════════════════════════════════════════════════════ */}
            <section className="relative mt-2 mb-10 overflow-hidden rounded-3xl bg-[#0a0a0f]" style={{ minHeight: '460px' }}>

              <Image
                src="https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/UncensoredArtHeroImage5.png"
                alt="AI companion — your perfect virtual partner on Veloura.ai"
                fill
                className="object-cover object-right"
                priority
              />

              {/* Gradient overlay: left=opaque dark, right=transparent so image shows */}
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #0a0a0f 35%, rgba(10,10,15,0.55) 52%, transparent 68%)' }} />

              {/* Animated aurora mesh */}
              <div className="pointer-events-none absolute -bottom-20 right-1/4 h-80 w-80 rounded-full bg-[#a855f7]/15 blur-3xl mesh-drift" style={{ animationDelay: '-6s' }} />
              <div className="pointer-events-none absolute top-1/2 left-0 h-64 w-64 rounded-full bg-[#c959ff]/10 blur-3xl mesh-drift" style={{ animationDelay: '-12s' }} />

              {/* Content */}
              <div className="relative z-10 flex min-h-[460px] flex-col justify-center px-6 py-12 sm:px-8 md:px-12 lg:max-w-[64%]">

                <Reveal variant="fade" duration={600}>
                  <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-[#ff3e8a]/30 bg-[#ff3e8a]/10 px-4 py-1.5 ring-pulse">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff3e8a]" />
                    <span className="text-[11px] font-bold tracking-widest text-[#ff3e8a] uppercase">The All-in-One Uncensored AI Platform</span>
                  </div>
                </Reveal>

                <Reveal variant="up" delay={120}>
                  <h1 className="text-4xl font-black leading-[1.04] tracking-tight text-white sm:text-5xl lg:text-[3.25rem] xl:text-[3.5rem]">
                    Your Fantasy.<br />
                    Your Rules.<br />
                    <span className="aurora-text">Nothing Held Back.</span>
                  </h1>
                </Reveal>

                <Reveal variant="up" delay={240}>
                  <p className="mt-5 max-w-xl text-base leading-relaxed text-white/65 sm:text-[17px]">
                    The only AI platform built to say <span className="text-white font-semibold">yes</span>. Chat a companion who remembers you. Generate uncensored images &amp; video. Edit photos with zero filters. Clone voices, compose songs, train a LoRA on your fantasy — every creative tool, one login.
                  </p>
                </Reveal>

                <Reveal variant="up" delay={360}>
                  <div className="mt-7 flex flex-wrap gap-3">
                    <Link
                      href="/ai-partner-lobby"
                      className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-[#ff3e8a] px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-[#ff3e8a]/25 transition hover:bg-[#ff3e8a]/90 hover:shadow-[#ff3e8a]/50 shine-on-hover"
                    >
                      Meet Your AI Partner
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                    <Link
                      href="/create-your-own-ai-character"
                      className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-white/35 hover:bg-white/10"
                    >
                      Create Your AI Girlfriend
                    </Link>
                  </div>
                </Reveal>

                <Reveal variant="fade" delay={500}>
                  <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2">
                    {['Free forever plan', 'No credit card', 'Zero content filters', 'Ready in 2 minutes'].map((item) => (
                      <span key={item} className="flex items-center gap-1.5 text-xs text-white/55">
                        <Check className="h-3.5 w-3.5 text-[#ff3e8a]" />
                        {item}
                      </span>
                    ))}
                  </div>
                </Reveal>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                TRUST BAR — rendered without reveal animation so it's always
                visible in the fold next to the hero on first paint.
            ═══════════════════════════════════════════════════════════════ */}
            <div className="my-2 grid grid-cols-2 gap-3 border-y border-white/8 py-6 sm:grid-cols-4">
              {[
                { value: '1,000+', label: 'AI Companions' },
                { value: '4',      label: 'Image Models'  },
                { value: '15+',    label: 'Creative Tools' },
                { value: '0',      label: 'Filters. Ever.' },
              ].map(({ value, label }) => (
                <div key={label} className="text-center">
                  <p className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-2xl font-black text-transparent sm:text-3xl">{value}</p>
                  <p className="mt-0.5 text-xs uppercase tracking-wider text-white/40">{label}</p>
                </div>
              ))}
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                PROBLEM / CONTRAST
            ═══════════════════════════════════════════════════════════════ */}
            <section className="mt-24">
              <Reveal variant="up">
                <div className="text-center">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ff3e8a]">Why People Switch</p>
                  <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl lg:text-5xl">
                    Tired of AI That Keeps <span className="aurora-text">Telling You No?</span>
                  </h2>
                  <p className="mt-4 mx-auto max-w-xl text-base text-white/55">
                    Every other AI was trained to refuse. We were trained to deliver. The difference is everything.
                  </p>
                </div>
              </Reveal>

              <div className="mt-12 grid gap-4 sm:grid-cols-2">
                <Reveal variant="left" delay={100}>
                  <div className="h-full rounded-2xl border border-white/8 bg-[#0d0d15] p-6">
                    <p className="mb-5 text-sm font-semibold text-white/30 uppercase tracking-widest">Everywhere Else</p>
                    <ul className="space-y-3.5">
                      {[
                        'NSFW content blocked by default',
                        'Roleplay cut short by safety warnings',
                        'Characters reset — no memory of you',
                        'Image generation censored inside the model',
                        'One narrow tool — no video, no voice, no editor',
                        'Conversations sanitised into corporate blandness',
                      ].map((item) => (
                        <li key={item} className="flex items-start gap-3">
                          <X className="mt-0.5 h-4 w-4 shrink-0 text-red-500/60" />
                          <span className="text-sm text-white/45">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>

                <Reveal variant="right" delay={200}>
                  <div className="relative h-full overflow-hidden rounded-2xl border border-[#ff3e8a]/25 bg-gradient-to-br from-[#ff3e8a]/8 via-[#a855f7]/4 to-transparent p-6">
                    <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#ff3e8a]/15 blur-3xl" />
                    <p className="mb-5 text-sm font-semibold text-[#ff3e8a] uppercase tracking-widest">Veloura.ai</p>
                    <ul className="relative space-y-3.5">
                      {[
                        'Every topic open. Every fantasy welcome.',
                        'Roleplay that never breaks character — ever.',
                        'Persistent memory that grows with every chat',
                        'Flux, SDXL, Pony & Illustrious — unrestricted',
                        'Chat, images, video, voice, editor — one platform',
                        'Raw, unfiltered conversation. Yours, always.',
                      ].map((item) => (
                        <li key={item} className="flex items-start gap-3">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#ff3e8a]" />
                          <span className="text-sm text-white/85">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                CORE CAPABILITIES BENTO
            ═══════════════════════════════════════════════════════════════ */}
            <section className="mt-28">

              <Reveal variant="up">
                <div className="text-center">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Everything You Need. One Login.</p>
                  <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl lg:text-5xl">
                    One Platform.<br />
                    <span className="aurora-text">Infinite Possibilities.</span>
                  </h2>
                  <p className="mt-4 mx-auto max-w-xl text-base text-white/55">
                    Seven production-grade AI tools stitched into one fluid experience. No tab juggling. No subscription stacking. No compromises.
                  </p>
                </div>
              </Reveal>

              {/* ── Big 3 cards ── */}
              <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                {/* AI Companion */}
                <Reveal variant="up" delay={0}>
                  <Link href="/ai-partner-lobby" className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/8 bg-[#0d0d15] tilt-lift hover:border-[#ff3e8a]/30 hover:shadow-2xl hover:shadow-[#ff3e8a]/10 shine-on-hover">
                    <div className="h-[2px] w-full bg-gradient-to-r from-[#ff3e8a] via-[#c959ff] to-transparent" />
                    <div className="pointer-events-none absolute -right-3 -top-2 select-none text-[8rem] font-black leading-none text-white opacity-[0.03]" aria-hidden>01</div>
                    <div className="relative flex flex-1 flex-col p-7">
                      <div className="mb-5 flex items-start justify-between">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[#ff3e8a]/20 bg-[#ff3e8a]/10">
                          <MessageCircle className="h-5 w-5 text-[#ff3e8a]" />
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/50">AI Companion</span>
                      </div>
                      <h3 className="text-xl font-black text-white leading-tight">She Talks. She Remembers.<br/>She&rsquo;s Yours.</h3>
                      <p className="mt-2.5 text-sm leading-relaxed text-white/50">
                        Your AI girlfriend — with persistent memory, uncensored NSFW roleplay and a personality built entirely around you. Not a chatbot. A companion.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {['Persistent Memory', 'NSFW Roleplay', 'Custom Personality', 'Voice & Photos'].map((f) => (
                          <span key={f} className="rounded-lg border border-white/8 bg-white/4 px-2.5 py-1 text-[11px] font-medium text-white/60">{f}</span>
                        ))}
                      </div>
                      <div className="mt-auto pt-5">
                        <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 px-4 py-3">
                          <span className="text-2xl font-black text-white">1,000+</span>
                          <span className="text-xs text-white/40">companions — ready to chat right now</span>
                        </div>
                        <div className="mt-5 flex items-center gap-1 text-sm font-bold text-[#ff3e8a]">
                          Meet your companion <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </Reveal>

                {/* AI Image Generation */}
                <Reveal variant="up" delay={120}>
                  <Link href="/create" className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/8 bg-[#0d0d15] tilt-lift hover:border-[#a855f7]/30 hover:shadow-2xl hover:shadow-[#a855f7]/10 shine-on-hover">
                    <div className="h-[2px] w-full bg-gradient-to-r from-[#a855f7] via-[#c959ff] to-transparent" />
                    <div className="pointer-events-none absolute -right-3 -top-2 select-none text-[8rem] font-black leading-none text-white opacity-[0.03]" aria-hidden>02</div>
                    <div className="relative flex flex-1 flex-col p-7">
                      <div className="mb-5 flex items-start justify-between">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[#a855f7]/20 bg-[#a855f7]/10">
                          <Wand2 className="h-5 w-5 text-[#a855f7]" />
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/50">Image Gen</span>
                      </div>
                      <h3 className="text-xl font-black text-white leading-tight">Type It.<br/>See It. Own It.</h3>
                      <p className="mt-2.5 text-sm leading-relaxed text-white/50">
                        NSFW image generation powered by Flux, SDXL, Pony & Illustrious. No watermarks, no output filtering, no refusals. Photoreal results in seconds.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {['Flux · SDXL · Pony · Illustrious', '4K Output', 'Txt → Img', 'Img → Img'].map((f) => (
                          <span key={f} className="rounded-lg border border-white/8 bg-white/4 px-2.5 py-1 text-[11px] font-medium text-white/60">{f}</span>
                        ))}
                      </div>
                      <div className="mt-auto pt-5">
                        <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 px-4 py-3">
                          <span className="text-2xl font-black text-white">4K</span>
                          <span className="text-xs text-white/40">photoreal output — zero censorship</span>
                        </div>
                        <div className="mt-5 flex items-center gap-1 text-sm font-bold text-[#a855f7]">
                          Start generating free <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </Reveal>

                {/* AI Video Generation — promoted to big card */}
                <Reveal variant="up" delay={240}>
                  <Link href="/uncensored-ai-video-generator" className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/8 bg-[#0d0d15] tilt-lift hover:border-[#ff3e8a]/30 hover:shadow-2xl hover:shadow-[#ff3e8a]/10 shine-on-hover">
                    <div className="h-[2px] w-full bg-gradient-to-r from-[#ff3e8a] via-[#a855f7] to-transparent" />
                    <div className="pointer-events-none absolute -right-3 -top-2 select-none text-[8rem] font-black leading-none text-white opacity-[0.03]" aria-hidden>03</div>
                    <div className="relative flex flex-1 flex-col p-7">
                      <div className="mb-5 flex items-start justify-between">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[#ff3e8a]/20 bg-[#ff3e8a]/10">
                          <Film className="h-5 w-5 text-[#ff3e8a]" />
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/50">Video Gen</span>
                      </div>
                      <h3 className="text-xl font-black text-white leading-tight">Still Images Are<br/>Not Enough.</h3>
                      <p className="mt-2.5 text-sm leading-relaxed text-white/50">
                        Transform any prompt or image into a living, moving scene. Face-swap, motion transfer, kissing & intimate clips — uncensored end-to-end.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {['Txt → Video', 'Img → Video', 'Face Swap Video', 'No Watermark'].map((f) => (
                          <span key={f} className="rounded-lg border border-white/8 bg-white/4 px-2.5 py-1 text-[11px] font-medium text-white/60">{f}</span>
                        ))}
                      </div>
                      <div className="mt-auto pt-5">
                        <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 px-4 py-3">
                          <span className="text-2xl font-black text-white">HD</span>
                          <span className="text-xs text-white/40">generated video — zero restrictions</span>
                        </div>
                        <div className="mt-5 flex items-center gap-1 text-sm font-bold text-[#ff3e8a]">
                          Generate video <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </Reveal>

              </div>

              {/* ── 4 smaller tool cards ── */}
              <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[
                  { href: '/ai-image-editor', icon: <Edit3 className="h-5 w-5 text-white/70" />, label: 'AI Image Editor', punch: 'Inpaint, face swap, upscale — all unrestricted.', stat: '15+ Tools', accent: 'text-[#ff3e8a]' },
                  { href: '/ai-audio', icon: <Mic className="h-5 w-5 text-white/70" />, label: 'Voice & Audio', punch: 'Clone any voice. Generate any song.', stat: '6 Tools', accent: 'text-[#a855f7]' },
                  { href: '/lora-training', icon: <Layers className="h-5 w-5 text-white/70" />, label: 'LoRA Training', punch: 'Train AI on your character. Perfect consistency.', stat: 'Custom', accent: 'text-[#ff3e8a]' },
                  { href: '/ai-apps', icon: <AppWindow className="h-5 w-5 text-white/70" />, label: 'AI Apps', punch: 'Face swap, cloth swap, AI strip & more.', stat: '10+ Apps', accent: 'text-[#a855f7]' },
                ].map(({ href, icon, label, punch, stat, accent }, i) => (
                  <Reveal key={href} variant="up" delay={i * 80}>
                    <Link
                      href={href}
                      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/8 bg-[#0d0d15] p-5 tilt-lift hover:border-white/20 hover:shadow-xl hover:shadow-black/40 shine-on-hover"
                    >
                      <div className="relative flex flex-1 flex-col">
                        <div className="mb-4 flex items-center justify-between">
                          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                            {icon}
                          </div>
                          <span className={`text-xs font-black ${accent}`}>{stat}</span>
                        </div>
                        <h3 className="text-base font-black text-white">{label}</h3>
                        <p className="mt-1.5 text-xs leading-relaxed text-white/45">{punch}</p>
                        <div className={`mt-auto pt-4 flex items-center gap-1 text-xs font-semibold ${accent} opacity-0 transition-opacity group-hover:opacity-100`}>
                          Explore <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </div>
                    </Link>
                  </Reveal>
                ))}
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                COMPANION DEEP DIVE
            ═══════════════════════════════════════════════════════════════ */}
            <section className="companion-section-glow companion-section-border relative mt-28 overflow-hidden rounded-3xl border bg-[#0a0a0f] p-6 sm:p-10 lg:p-16">

              <div
                className="pointer-events-none absolute -right-8 -top-8 select-none font-black leading-none text-white"
                style={{ fontSize: 'clamp(8rem, 20vw, 18rem)', opacity: 0.025 }}
                aria-hidden="true"
              >
                AI
              </div>

              <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[#ff3e8a]/15 blur-3xl mesh-drift" />
              <div className="pointer-events-none absolute -top-16 right-16 h-48 w-48 rounded-full bg-[#a855f7]/12 blur-3xl mesh-drift" style={{ animationDelay: '-8s' }} />

              <div className="relative flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-16">

                {/* Left: Copy */}
                <div className="flex-1 min-w-0">
                  <Reveal variant="left">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ff3e8a]">AI Companion</p>
                    <h2 className="mt-4 text-3xl font-black leading-[1.05] tracking-tight text-white sm:text-4xl lg:text-5xl">
                      She Remembers<span className="text-[#ff3e8a]">.</span><br />
                      She Evolves<span className="text-[#ff3e8a]">.</span><br />
                      She&rsquo;s <span className="aurora-text">Yours.</span>
                    </h2>
                    <p className="mt-5 max-w-lg text-base leading-relaxed text-white/60">
                      Not a chatbot. Not a scripted loop. A companion with real memory, real personality and a presence that grows deeper with every conversation.
                    </p>
                  </Reveal>

                  <ul className="mt-8 space-y-5">
                    {[
                      { title: 'Memory that never forgets', desc: 'She remembers your name, your stories, the things you told her last week. Every conversation builds on the last.' },
                      { title: 'Zero-filter roleplay', desc: 'No scenario off-limits. No topic flagged. Your imagination is the only ceiling.' },
                      { title: 'A voice of her own', desc: 'Clone a voice, pick one from our library or design one from scratch. Hear her speak — not just read her words.' },
                      { title: 'Personality, tuned by you', desc: 'Shy, dominant, nurturing, playful, unhinged — shape every facet of who she is.' },
                    ].map(({ title, desc }, i) => (
                      <Reveal key={title} variant="up" delay={i * 110} as="li">
                        <div className="flex items-start gap-4">
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#ff3e8a] shadow-[0_0_10px_rgba(255,62,138,0.9)]" />
                          <div>
                            <p className="text-sm font-bold text-white">{title}</p>
                            <p className="mt-1 text-sm leading-relaxed text-white/55">{desc}</p>
                          </div>
                        </div>
                      </Reveal>
                    ))}
                  </ul>

                  <Reveal variant="up" delay={500}>
                    <div className="mt-10 flex flex-wrap gap-3">
                      <Link
                        href="/ai-partner-lobby"
                        className="inline-flex items-center gap-2 rounded-xl bg-[#ff3e8a] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#ff3e8a]/25 transition hover:bg-[#ff3e8a]/90 hover:shadow-[#ff3e8a]/50"
                      >
                        Meet Your AI Partner <ArrowRight className="h-4 w-4" />
                      </Link>
                      <Link
                        href="/ai-girlfriend-chat"
                        className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
                      >
                        Explore the Chat
                      </Link>
                    </div>
                  </Reveal>
                </div>

                {/* Right: Card swiper */}
                <Reveal variant="right" delay={200} className="relative w-full shrink-0 lg:w-[500px] xl:w-[560px]">
                  <div
                    className="pointer-events-none absolute -inset-4 rounded-3xl"
                    style={{ background: 'radial-gradient(ellipse at center, rgba(255,62,138,0.22) 0%, transparent 70%)', animation: 'floatGlow 5s ease-in-out infinite' }}
                  />
                  <div className="relative flex items-center justify-center py-8">
                    {heroCharacters.length > 0 ? (
                      <HeroCardSwiper characters={heroCharacters.map(c => ({
                        id: c.id,
                        name: c.name,
                        characterAvatarUrl: c.characterAvatarUrl,
                        gender: c.gender as string,
                        style: c.style as string,
                      }))} />
                    ) : (
                      <div className="flex h-[480px] w-[320px] items-center justify-center rounded-2xl border border-white/8 bg-white/4">
                        <p className="text-xs text-white/30">No characters yet</p>
                      </div>
                    )}
                  </div>
                </Reveal>

              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                IMAGE MODELS SHOWCASE — Flux, SDXL, Pony, Illustrious
            ═══════════════════════════════════════════════════════════════ */}
            <section className="mt-28">
              <Reveal variant="up">
                <div className="text-center">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a855f7]">The Model Zoo</p>
                  <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl lg:text-5xl">
                    Six Engines.<br />
                    <span className="aurora-text">One Uncensored Canvas.</span>
                  </h2>
                  <p className="mt-4 mx-auto max-w-xl text-base text-white/55">
                    Switch models on the fly. Pick photorealism, anime, illustration or cinematic — whichever serves your vision. No model is locked. Nothing is sanitised.
                  </p>
                </div>
              </Reveal>

              <div
                className="mt-12 flex gap-4 overflow-x-auto overflow-y-hidden pb-4 home-hide-scrollbar"
                style={{ scrollSnapType: 'x mandatory' }}
              >
                {[
                  {
                    name: 'Flux',
                    tag: 'Photoreal',
                    desc: 'The benchmark for photorealism. Textures, light and skin that feel like a camera shot — not a render.',
                    strength: 'Best for: hyperreal portraits, cinematic scenes.',
                    icon: <Sparkles className="h-5 w-5" />,
                    accent: '#ff3e8a',
                  },
                  {
                    name: 'SDXL',
                    tag: 'Versatile',
                    desc: 'The trusted workhorse. Rich prompt understanding, huge community, and the widest LoRA ecosystem on the planet.',
                    strength: 'Best for: all-purpose generation, composability.',
                    icon: <Palette className="h-5 w-5" />,
                    accent: '#a855f7',
                  },
                  {
                    name: 'Pony',
                    tag: 'Stylised',
                    desc: 'The character model. Unmatched anatomy, expressive poses and stylised art with full NSFW fluency.',
                    strength: 'Best for: character art, NSFW stylised scenes.',
                    icon: <Flame className="h-5 w-5" />,
                    accent: '#ff3e8a',
                  },
                  {
                    name: 'Illustrious',
                    tag: 'Anime',
                    desc: 'State-of-the-art anime illustration. Clean linework, vibrant colour and faithful character reproduction.',
                    strength: 'Best for: anime, manga, illustration.',
                    icon: <Star className="h-5 w-5" />,
                    accent: '#a855f7',
                  },
                  {
                    name: 'Z Image Turbo',
                    tag: 'Turbo',
                    desc: 'Lightning-fast generation without sacrificing realism. Near-real-time drafts — iterate on ideas in seconds.',
                    strength: 'Best for: rapid iteration, quick concepts.',
                    icon: <Rocket className="h-5 w-5" />,
                    accent: '#ff3e8a',
                  },
                  {
                    name: 'Qwen',
                    tag: 'Prompt-Accurate',
                    desc: 'Exceptional prompt comprehension and scene composition. Follows complex instructions with uncanny precision.',
                    strength: 'Best for: long prompts, compound scenes.',
                    icon: <Brain className="h-5 w-5" />,
                    accent: '#a855f7',
                  },
                ].map(({ name, tag, desc, strength, icon, accent }, i) => (
                  <Reveal key={name} variant="up" delay={i * 80} className="shrink-0" style={{ scrollSnapAlign: 'start' }}>
                    <div
                      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/8 bg-[#0d0d15] p-6 tilt-lift hover:border-white/20 hover:shadow-2xl hover:shadow-black/50 shine-on-hover"
                      style={{ width: 'clamp(260px, 22vw, 300px)', minHeight: 280 }}
                    >
                      <div
                        className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full blur-3xl transition-opacity duration-500 opacity-30 group-hover:opacity-70"
                        style={{ background: `radial-gradient(circle, ${accent}44, transparent 70%)` }}
                      />
                      <div className="relative flex items-center justify-between">
                        <div
                          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border"
                          style={{ borderColor: `${accent}33`, background: `${accent}12`, color: accent }}
                        >
                          {icon}
                        </div>
                        <span
                          className="rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                          style={{ borderColor: `${accent}33`, color: accent }}
                        >
                          {tag}
                        </span>
                      </div>
                      <h3 className="relative mt-5 text-xl font-black text-white">{name}</h3>
                      <p className="relative mt-2 text-sm leading-relaxed text-white/55">{desc}</p>
                      <p className="relative mt-auto pt-4 text-[11px] font-medium uppercase tracking-wider text-white/35">{strength}</p>
                    </div>
                  </Reveal>
                ))}
              </div>

              <Reveal variant="up" delay={200}>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Link
                    href="/create"
                    className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 hover:border-white/25"
                  >
                    Try every model free <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/models"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-6 py-3 text-sm font-semibold text-white/70 transition hover:text-white hover:border-white/20"
                  >
                    Browse the model library
                  </Link>
                </div>
              </Reveal>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                IMAGE GENERATION DEEP DIVE — editorial split with video
            ═══════════════════════════════════════════════════════════════ */}
            <section className="mt-28">
              <div className="relative flex flex-col gap-12 overflow-hidden rounded-3xl border border-white/8 bg-[#0a0a0f] p-6 sm:p-10 lg:flex-row lg:items-center lg:gap-16 lg:p-14">
                <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[#ff3e8a]/15 blur-3xl mesh-drift" />
                <div className="pointer-events-none absolute -bottom-16 -right-16 h-72 w-72 rounded-full bg-[#a855f7]/12 blur-3xl mesh-drift" style={{ animationDelay: '-9s' }} />

                {/* Left: editorial copy */}
                <Reveal variant="left" className="relative flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ff3e8a]">AI Image Generation</p>
                  <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                    Create Images<br />
                    Without <span className="aurora-text">Limits.</span>
                  </h2>
                  <p className="mt-4 max-w-lg text-base leading-relaxed text-white/60">
                    Type any prompt. Any style. Any scenario. Our generation stack renders photoreal output in seconds — no watermarks, no prompts censored, no outputs quietly flagged.
                  </p>

                  <ul className="mt-8 space-y-4">
                    {[
                      { title: 'Zero filters, zero refusals',   desc: 'Every prompt runs. Every output renders. We never modify, soften or block your request.' },
                      { title: 'Multi-model canvas',            desc: 'Flip between Flux, SDXL, Pony, Illustrious, Z Image Turbo and Qwen — all from one prompt box.' },
                      { title: 'Use your LoRAs instantly',      desc: 'Train once, reuse everywhere. Your character locks in — same face, every frame.' },
                    ].map(({ title, desc }, i) => (
                      <Reveal key={title} variant="up" delay={i * 90} as="li">
                        <div className="flex items-start gap-3.5">
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#ff3e8a] shadow-[0_0_10px_rgba(255,62,138,0.9)]" />
                          <div>
                            <p className="text-sm font-bold text-white">{title}</p>
                            <p className="mt-0.5 text-sm leading-relaxed text-white/55">{desc}</p>
                          </div>
                        </div>
                      </Reveal>
                    ))}
                  </ul>

                  <div className="mt-10 flex flex-wrap gap-3">
                    <Link
                      href="/create"
                      className="inline-flex items-center gap-2 rounded-xl bg-[#ff3e8a] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#ff3e8a]/25 transition hover:bg-[#ff3e8a]/90 hover:shadow-[#ff3e8a]/50"
                    >
                      Start Generating <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/uncensored-ai-generator"
                      className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
                    >
                      See Uncensored Gallery
                    </Link>
                  </div>
                </Reveal>

                {/* Right: looping editorial video (sized to match AI Video Generation) */}
                <Reveal variant="right" delay={200} className="relative w-full shrink-0 lg:w-[420px] xl:w-[480px]">
                  <div className="pointer-events-none absolute -inset-6 rounded-3xl bg-gradient-to-br from-[#ff3e8a]/15 via-transparent to-[#a855f7]/15 blur-2xl mesh-drift" />
                  <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0f] aspect-[4/5]">
                    <video
                      src="https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/UncensoredLandingPageImageGenerationVideo.mp4"
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="metadata"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <span className="absolute right-4 top-4 rounded-full bg-black/55 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur-sm">
                      4K · Uncensored
                    </span>
                  </div>
                </Reveal>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                LORA TRAINING DEEP DIVE
            ═══════════════════════════════════════════════════════════════ */}
            <section className="mt-28">
              <div className="relative overflow-hidden rounded-3xl border border-white/8 bg-gradient-to-br from-[#0d0d15] via-[#0a0a0f] to-[#0d0d15] p-8 sm:p-12 lg:p-16">

                <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#a855f7]/12 blur-3xl mesh-drift" />
                <div className="pointer-events-none absolute -bottom-16 left-1/4 h-56 w-56 rounded-full bg-[#ff3e8a]/10 blur-3xl mesh-drift" style={{ animationDelay: '-9s' }} />

                <div className="relative flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-16">
                  <Reveal variant="left" className="flex-1 min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a855f7]">LoRA Training</p>
                    <h2 className="mt-3 text-3xl font-black leading-[1.1] text-white sm:text-4xl lg:text-5xl">
                      Train AI on <span className="aurora-text">Your Fantasy.</span><br />
                      Render It. Forever.
                    </h2>
                    <p className="mt-5 max-w-lg text-base leading-relaxed text-white/60">
                      Upload 10–30 reference images. We train a custom LoRA in minutes. Every generation afterwards renders your subject with <span className="text-white font-semibold">perfect consistency</span> — same face, same body, same vibe, every single time.
                    </p>

                    <ul className="mt-8 space-y-4">
                      {[
                        { title: 'Minutes, not hours', desc: 'Optimised training pipeline delivers a working LoRA in ~10 minutes.' },
                        { title: 'Face, character or style', desc: 'Train on a person, a character, an outfit, even an art style.' },
                        { title: 'Plugs into every model', desc: 'Use your LoRA with Flux, SDXL, Pony and Illustrious — zero rework.' },
                        { title: 'Private by default', desc: 'Your training data is yours alone. Never shared, never used to train public models.' },
                      ].map(({ title, desc }, i) => (
                        <Reveal key={title} variant="up" delay={i * 90} as="li">
                          <div className="flex items-start gap-3.5">
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#a855f7] shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
                            <div>
                              <p className="text-sm font-bold text-white">{title}</p>
                              <p className="mt-0.5 text-sm text-white/55">{desc}</p>
                            </div>
                          </div>
                        </Reveal>
                      ))}
                    </ul>

                    <Reveal variant="up" delay={500}>
                      <div className="mt-10 flex flex-wrap gap-3">
                        <Link href="/lora-training" className="inline-flex items-center gap-2 rounded-xl bg-[#a855f7] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#a855f7]/25 transition hover:bg-[#a855f7]/90 hover:shadow-[#a855f7]/50">
                          Train Your Model <ArrowRight className="h-4 w-4" />
                        </Link>
                        <Link href="/models" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/5">
                          Browse Trained Models
                        </Link>
                      </div>
                    </Reveal>
                  </Reveal>

                  {/* Right: auto-sliding LoRA output gallery */}
                  <Reveal variant="right" delay={200} className="w-full shrink-0 lg:w-[420px] xl:w-[480px]">
                    <LoraGallery
                      images={loraGalleryImages}
                      intervalMs={3000}
                    />
                  </Reveal>
                </div>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                AI VIDEO GENERATION DEEP DIVE
            ═══════════════════════════════════════════════════════════════ */}
            <section className="mt-28">
              <div className="flex flex-col gap-12 rounded-3xl border border-white/8 bg-[#0d0d15] p-6 sm:p-10 lg:flex-row lg:items-center lg:gap-16 lg:p-14">

                <Reveal variant="left" className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ff3e8a]">AI Video Generation</p>
                  <h2 className="mt-3 text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
                    When Still <br/>Isn&rsquo;t Enough.
                  </h2>
                  <p className="mt-4 max-w-lg text-base leading-relaxed text-white/60">
                    Bring your images to life. Animate your companion. Swap faces in video. Generate motion that looks, sounds and feels real — with zero platform pulling you back.
                  </p>

                  <ul className="mt-8 space-y-4">
                    {[
                      { title: 'Text-to-video in one click', desc: 'Describe a scene. Watch it unfold in seconds — no storyboarding, no setup.' },
                      { title: 'Image-to-video motion', desc: 'Bring any still to life. Natural movement, natural light.' },
                      { title: 'Face swap in full video', desc: 'Replace any face in any clip — frame-perfect, watermark-free.' },
                      { title: 'Zero content filter', desc: 'Every output. Every frame. Yours. Never flagged.' },
                    ].map(({ title, desc }, i) => (
                      <Reveal key={title} variant="up" delay={i * 90} as="li">
                        <div className="flex items-start gap-3.5">
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#ff3e8a] shadow-[0_0_10px_rgba(255,62,138,0.8)]" />
                          <div>
                            <p className="text-sm font-bold text-white">{title}</p>
                            <p className="mt-0.5 text-sm text-white/55">{desc}</p>
                          </div>
                        </div>
                      </Reveal>
                    ))}
                  </ul>

                  <Reveal variant="up" delay={500}>
                    <div className="mt-10 flex flex-wrap gap-3">
                      <Link href="/uncensored-ai-video-generator" className="inline-flex items-center gap-2 rounded-xl bg-[#ff3e8a] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#ff3e8a]/25 transition hover:bg-[#ff3e8a]/90 hover:shadow-[#ff3e8a]/50">
                        Generate Your First Video <ArrowRight className="h-4 w-4" />
                      </Link>
                      <Link href="/ai-video-generator" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/5">
                        See Video Gallery
                      </Link>
                    </div>
                  </Reveal>
                </Reveal>

                {/* Right: rotating showcase of 3 AI-generated videos (10s each) */}
                <Reveal variant="right" delay={200} className="w-full shrink-0 lg:w-[420px] xl:w-[480px]">
                  <div className="relative">
                    <div className="pointer-events-none absolute -inset-6 rounded-3xl bg-gradient-to-br from-[#ff3e8a]/15 via-transparent to-[#a855f7]/15 blur-2xl mesh-drift" />
                    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0f] aspect-[4/5]">
                      <VideoRotator
                        sources={[
                          'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/UncensoredArtLandingPageVideo1.mp4',
                          'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/UncensoredArtLandingPageVideo2.mp4',
                          'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/UncensoredArtLandingPageVideo3.mp4',
                        ]}
                        intervalMs={5000}
                      />
                      {/* soft bottom fade for the info card legibility */}
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-5">
                        <div className="rounded-xl border border-white/10 bg-black/50 p-4 backdrop-blur-md">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[#ff3e8a]">Live Example</p>
                          <p className="mt-1 text-sm font-semibold text-white">Prompt → HD Video</p>
                          <p className="mt-0.5 text-xs text-white/50">Rendered in ~30s. Watermark-free.</p>
                        </div>
                      </div>
                      <span className="absolute left-4 top-4 rounded-full bg-[#ff3e8a] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white">HD · Uncensored</span>
                    </div>
                  </div>
                </Reveal>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                AI IMAGE EDITOR DEEP DIVE
            ═══════════════════════════════════════════════════════════════ */}
            <section className="mt-28">
              <div className="flex flex-col gap-12 rounded-3xl border border-[#a855f7]/15 bg-gradient-to-br from-[#0d0d15] via-[#0a0a0f] to-[#0d0d15] p-6 sm:p-10 lg:flex-row-reverse lg:items-center lg:gap-16 lg:p-14 overflow-hidden relative">

                <div className="pointer-events-none absolute -top-32 right-1/3 h-72 w-72 rounded-full bg-[#a855f7]/12 blur-3xl mesh-drift" />

                <Reveal variant="right" className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a855f7]">AI Image Editor</p>
                  <h2 className="mt-3 text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
                    Change Anything.<br /><span className="aurora-text">Censor Nothing.</span>
                  </h2>
                  <p className="mt-4 max-w-lg text-base leading-relaxed text-white/60">
                    A full editorial studio powered by AI — fifteen+ tools for every gesture a photo needs. Inpaint flaws. Outpaint boundaries. Swap faces. Upscale to 4×. Every tool, zero restrictions.
                  </p>

                  <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {[
                      { label: 'Inpaint',    desc: 'Rewrite any region',      href: '/ai-image-editor' },
                      { label: 'Outpaint',   desc: 'Extend the canvas',       href: '/ai-image-editor' },
                      { label: 'Face Swap',  desc: 'Any face. Any photo.',    href: '/ai-apps/face-swap' },
                      { label: 'BG Remove',  desc: 'Instant cutouts',         href: '/ai-apps/background-remover' },
                      { label: '4× Upscale', desc: 'Print-ready resolution',  href: '/ai-image-editor' },
                      { label: 'Relight',    desc: 'New mood, same scene',    href: '/ai-image-editor' },
                    ].map(({ label, desc, href }, i) => (
                      <Reveal key={label} variant="scale" delay={i * 60}>
                        <Link
                          href={href}
                          className="group block rounded-xl border border-white/8 bg-white/4 p-3 transition hover:border-[#a855f7]/40 hover:bg-[#a855f7]/8 hover:shadow-lg hover:shadow-[#a855f7]/10"
                        >
                          <p className="text-sm font-bold text-white group-hover:text-[#a855f7] transition-colors">{label}</p>
                          <p className="mt-0.5 text-[11px] text-white/45">{desc}</p>
                        </Link>
                      </Reveal>
                    ))}
                  </div>

                  <Reveal variant="up" delay={420}>
                    <div className="mt-10 flex flex-wrap gap-3">
                      <Link href="/ai-image-editor" className="inline-flex items-center gap-2 rounded-xl bg-[#a855f7] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#a855f7]/25 transition hover:bg-[#a855f7]/90 hover:shadow-[#a855f7]/50">
                        Open the Editor <ArrowRight className="h-4 w-4" />
                      </Link>
                      <Link href="/edit-image" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/5">
                        See Every Tool
                      </Link>
                    </div>
                  </Reveal>
                </Reveal>

                <Reveal variant="left" delay={200} className="w-full shrink-0 lg:w-[420px] xl:w-[480px]">
                  <div className="relative">
                    <div className="pointer-events-none absolute -inset-6 rounded-3xl bg-gradient-to-br from-[#a855f7]/15 via-transparent to-[#ff3e8a]/15 blur-2xl mesh-drift" />
                    <div className="relative grid grid-cols-2 gap-4">
                      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/8 bg-[#0d0d15] tilt-lift">
                        <Image
                          src="https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/UncensoredArtImageEditBefore.png"
                          alt="Original photo before AI editing"
                          fill
                          sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 480px"
                          unoptimized
                          className="object-cover"
                        />
                        <span className="absolute left-3 top-3 rounded-md bg-black/60 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-white/80 backdrop-blur-sm">Before</span>
                      </div>
                      <div className="relative aspect-[3/4] translate-y-8 overflow-hidden rounded-2xl border border-[#a855f7]/25 shadow-2xl shadow-[#a855f7]/20 tilt-lift">
                        <Image
                          src="https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/UncensoredArtImageEditAfter.png"
                          alt="AI-edited result"
                          fill
                          sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 480px"
                          unoptimized
                          className="object-cover"
                        />
                        <span className="absolute left-3 top-3 rounded-md bg-[#a855f7]/90 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-sm">After · AI</span>
                      </div>
                    </div>
                  </div>
                </Reveal>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                AI APPS STRIP
            ═══════════════════════════════════════════════════════════════ */}
            <section className="mt-28">
              <Reveal variant="up">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ff3e8a]">AI Apps — Zero Restrictions</p>
                    <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">
                      Do What Other Apps <span className="aurora-text">Won&rsquo;t Let You.</span>
                    </h2>
                    <p className="mt-2 max-w-lg text-base text-white/55">
                      Face-swap anyone. Strip any outfit. Clone any look. Ten uncensored AI tools that go where every other platform refuses.
                    </p>
                  </div>
                  <Link href="/ai-apps" className="shrink-0 inline-flex items-center gap-1 text-sm font-semibold text-[#ff3e8a] transition hover:text-[#ff3e8a]/80">
                    Explore all tools <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </Reveal>

              {/* Horizontal strip */}
              <div
                className="mt-8 flex gap-4 overflow-x-auto overflow-y-hidden pb-4 home-hide-scrollbar"
                style={{ scrollSnapType: 'x mandatory' }}
              >
                {([
                  { href: '/ai-apps/face-swap',              icon: <Copy className="h-5 w-5" />,        label: 'Face Swap',          desc: 'Put any face on any photo. Instantly.',     tag: 'Most Popular', tagColor: 'bg-[#ff3e8a]', image: 'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/UncensoredArtFaceSwap.jpg' },
                  { href: '/ai-apps/deepfake-videos',        icon: <Video className="h-5 w-5" />,       label: 'Face Swap Video',    desc: 'Swap faces across full video clips.',       tag: null, tagColor: '', video: 'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/UncensoredArt-FaceSwapVideo.mp4' },
                  { href: '/ai-apps/background-remover',     icon: <X className="h-5 w-5" />,           label: 'AI Eraser',          desc: 'Erase any background in one click.',        tag: null, tagColor: '', image: 'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/UncensoredArt-AIEraser.jpg' },
                  { href: '/ai-apps/ai-filters',             icon: <Wand2 className="h-5 w-5" />,       label: 'AI Filters',         desc: 'Transform any photo into any style.',       tag: null, tagColor: '', image: 'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/UncensoredArt-AIFilters.jpg'},
                  { href: '/ai-apps/ai-avatar-generator',    icon: <Sparkles className="h-5 w-5" />,    label: 'Avatar Generator',   desc: 'Generate a hyper-realistic AI avatar.',     tag: 'New', tagColor: 'bg-[#a855f7]', image: 'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/UncensoredArt-AIAvatarGenerator.jpg' },
                  { href: '/ai-apps/ai-together',            icon: <Globe className="h-5 w-5" />,       label: 'AI Together',        desc: 'Place yourself with anyone, anywhere.',     tag: null, tagColor: '', image: 'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/UncensoredArt-AITogether.jpg' },
                  { href: '/ai-apps/ai-kissing-video-creator', icon: <MessageCircle className="h-5 w-5" />, label: 'Kissing Booth',  desc: 'Generate intimate AI kissing videos.',      tag: 'Hot', tagColor: 'bg-orange-500', image: 'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/UncensoredArt-AIKissingBooth.jpg' },
                  { href: '/ai-apps/cloth-swap',             icon: <Edit3 className="h-5 w-5" />,       label: 'Cloth Swap',         desc: 'Change any outfit on any photo.',           tag: null, tagColor: '', image: 'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/UncensoredArt-AIClothSwap.jpg' },
                  { href: '/ai-apps/ai-stripe',              icon: <Zap className="h-5 w-5" />,         label: 'AI Strip',           desc: 'Uncensored. No clothes. No limits.',        tag: '18+', tagColor: 'bg-red-500', image: 'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/UncensoredArt-AIStrip.jpg' },
                  { href: '/ai-apps/background-changer',     icon: <AppWindow className="h-5 w-5" />,   label: 'Background Changer', desc: 'Drop any background into any scene.',       tag: null, tagColor: '', image: 'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/LandingPage/UncensoredArt-BackgroundChanger.jpg' },
                ] as Array<{ href: string; icon: React.ReactNode; label: string; desc: string; tag: string | null; tagColor: string; image?: string; video?: string }>).map(({ href, icon, label, desc, tag, tagColor, image, video }, i) => (
                  <Reveal key={href} variant="up" delay={i * 50} className="shrink-0" style={{ scrollSnapAlign: 'start' }}>
                    <Link
                      href={href}
                      className="group relative flex h-full shrink-0 flex-col overflow-hidden rounded-2xl border border-white/8 bg-[#0d0d15] tilt-lift hover:border-[#ff3e8a]/40 hover:shadow-lg hover:shadow-[#ff3e8a]/15 shine-on-hover"
                      style={{ width: 'clamp(175px, 20vw, 210px)' }}
                    >
                      <div className="relative w-full overflow-hidden" style={{ height: 200 }}>
                        {video ? (
                          <video
                            src={video}
                            autoPlay
                            loop
                            muted
                            playsInline
                            preload="metadata"
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : image ? (
                          <Image
                            src={image}
                            alt={label}
                            fill
                            sizes="(max-width: 768px) 50vw, 210px"
                            quality={75}
                            loading="lazy"
                            unoptimized
                            className="object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-white/4 to-white/2">
                            <span className="text-white/25">{icon}</span>
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#0d0d15] to-transparent" />
                        {tag && (
                          <span className={`absolute left-2.5 top-2.5 rounded-full ${tagColor} px-2 py-0.5 text-[10px] font-bold text-white`}>
                            {tag}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 p-4">
                        <p className="text-sm font-bold text-white leading-tight group-hover:text-[#ff3e8a] transition-colors">
                          {label}
                        </p>
                        <p className="text-xs leading-relaxed text-white/45">{desc}</p>
                        <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-[#ff3e8a] opacity-0 transition-opacity group-hover:opacity-100">
                          Try it free <ChevronRight className="h-3 w-3" />
                        </p>
                      </div>
                    </Link>
                  </Reveal>
                ))}
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                VOICE & AUDIO — immersive studio
            ═══════════════════════════════════════════════════════════════ */}
            <section className="mt-28">
              <div className="relative overflow-hidden rounded-3xl border border-white/8 bg-gradient-to-br from-[#0d0d15] via-[#0a0a0f] to-[#0d0d15] p-8 sm:p-12 lg:p-16">

                <div className="pointer-events-none absolute -top-32 -right-20 h-80 w-80 rounded-full bg-[#a855f7]/15 blur-3xl mesh-drift" />
                <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-[#ff3e8a]/10 blur-3xl mesh-drift" style={{ animationDelay: '-7s' }} />

                {/* animated waveform line — purely decorative */}
                <div className="pointer-events-none absolute inset-x-0 top-1/2 hidden -translate-y-1/2 items-center justify-center gap-1 opacity-20 lg:flex">
                  {Array.from({ length: 64 }).map((_, i) => (
                    <span
                      key={i}
                      className="block w-[3px] rounded-full bg-gradient-to-b from-[#ff3e8a] to-[#a855f7]"
                      style={{
                        height: `${8 + Math.abs(Math.sin(i * 0.7)) * 60}px`,
                        animation: `subtleRise ${2 + (i % 5) * 0.25}s ease-in-out ${i * 60}ms infinite alternate`,
                      }}
                    />
                  ))}
                </div>

                <Reveal variant="up" className="relative">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a855f7]">Voice &amp; Audio Studio</p>
                      <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl lg:text-5xl">
                        A Voice for <span className="aurora-text">Every Vision.</span>
                      </h2>
                      <p className="mt-3 max-w-xl text-base text-white/60">
                        Give your companion a voice. Clone any performer. Generate full songs with vocals or write a cinematic score. Six studio-grade tools, one fluid workflow.
                      </p>
                    </div>
                    <Link href="/ai-audio" className="shrink-0 inline-flex items-center gap-1 rounded-xl border border-[#a855f7]/30 bg-[#a855f7]/10 px-4 py-2 text-sm font-semibold text-[#a855f7] transition hover:bg-[#a855f7]/20">
                      Open the Studio <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </Reveal>

                <div className="relative mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    { href: '/ai-audio/text-to-speech',            icon: <AudioLines className="h-5 w-5" />,  label: 'Text to Speech',    desc: 'Natural, emotive narration in 30+ languages. Instant.',                 accent: '#ff3e8a', tag: 'Real-time' },
                    { href: '/ai-audio/voice-cloning',             icon: <Copy className="h-5 w-5" />,         label: 'Voice Cloning',     desc: 'Upload 30 seconds. Clone any voice with uncanny accuracy.',             accent: '#a855f7', tag: 'Precision' },
                    { href: '/ai-audio/sound-effect',              icon: <Volume2 className="h-5 w-5" />,      label: 'Sound Effects',     desc: 'Describe a sound. Hear it in a breath. Cinematic quality.',             accent: '#ff3e8a', tag: 'Text-to-SFX' },
                    { href: '/ai-audio/song-cover-fun',            icon: <Headphones className="h-5 w-5" />,   label: 'Song Cover',        desc: 'Transform any track with any vocalist. Studio fidelity.',                accent: '#a855f7', tag: 'Remix' },
                    { href: '/ai-audio/song-generation-vocal',     icon: <Mic className="h-5 w-5" />,          label: 'Song Generation',   desc: 'Full tracks with vocals, harmonies and instrumentation — from a prompt.', accent: '#ff3e8a', tag: 'Full Song' },
                    { href: '/ai-audio/music-generation-no-vocal', icon: <Music className="h-5 w-5" />,        label: 'Music Generation',  desc: 'Cinematic scores, lo-fi beats, orchestral pieces. No vocals.',          accent: '#a855f7', tag: 'Instrumental' },
                  ].map(({ href, icon, label, desc, accent, tag }, i) => (
                    <Reveal key={href} variant="up" delay={i * 80}>
                      <Link
                        href={href}
                        className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/8 bg-[#0d0d15] p-5 tilt-lift hover:shadow-2xl shine-on-hover"
                        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
                      >
                        <div
                          className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full blur-3xl opacity-25 transition-opacity duration-500 group-hover:opacity-70"
                          style={{ background: `radial-gradient(circle, ${accent}55, transparent 70%)` }}
                        />
                        <div className="relative flex items-center justify-between">
                          <div
                            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border transition group-hover:scale-110"
                            style={{ borderColor: `${accent}33`, background: `${accent}12`, color: accent }}
                          >
                            {icon}
                          </div>
                          <span
                            className="rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                            style={{ borderColor: `${accent}33`, color: accent }}
                          >
                            {tag}
                          </span>
                        </div>
                        <h3 className="relative mt-5 text-lg font-black text-white group-hover:text-white">{label}</h3>
                        <p className="relative mt-1.5 text-sm leading-relaxed text-white/55">{desc}</p>
                        <div className="relative mt-4 flex items-center gap-1 text-xs font-semibold opacity-0 transition-opacity group-hover:opacity-100" style={{ color: accent }}>
                          Try it free <ChevronRight className="h-3.5 w-3.5" />
                        </div>
                      </Link>
                    </Reveal>
                  ))}
                </div>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                HOW IT WORKS
            ═══════════════════════════════════════════════════════════════ */}
            <section className="mt-28">
              <Reveal variant="up">
                <div className="text-center">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Getting Started</p>
                  <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl lg:text-5xl">
                    Three Steps to <span className="aurora-text">Your AI World.</span>
                  </h2>
                  <p className="mt-4 mx-auto max-w-lg text-base text-white/55">
                    From zero to your first conversation in under two minutes. No setup wizard. No credit card. Just you and your imagination.
                  </p>
                </div>
              </Reveal>

              <div className="relative mt-12 grid gap-6 sm:grid-cols-3">
                <div className="absolute top-8 left-[calc(16.67%+1.5rem)] right-[calc(16.67%+1.5rem)] hidden h-px bg-gradient-to-r from-[#ff3e8a]/30 via-[#a855f7]/30 to-[#ff3e8a]/30 sm:block" />
                {[
                  { step: '01', color: 'text-[#ff3e8a]', border: 'border-[#ff3e8a]/20', bg: 'bg-[#ff3e8a]/5', title: 'Choose or Create', desc: 'Browse 1,000+ AI companions — or design your own in under two minutes. Appearance, personality, voice.', href: '/create-your-own-ai-character', cta: 'Start here' },
                  { step: '02', color: 'text-[#a855f7]', border: 'border-[#a855f7]/20', bg: 'bg-[#a855f7]/5', title: 'Chat Without Limits', desc: 'Talk, flirt, roleplay. Your companion responds with full memory and zero restrictions — exactly the way you want.', href: '/free-nsfw-ai-chat', cta: 'Explore chat' },
                  { step: '03', color: 'text-[#ff3e8a]', border: 'border-[#ff3e8a]/20', bg: 'bg-[#ff3e8a]/5', title: 'Create Together', desc: 'Generate images of her. Clone her voice. Make videos. Train a LoRA. Build a world around your companion.', href: '/create', cta: 'See all tools' },
                ].map(({ step, color, border, bg, title, desc, href, cta }, i) => (
                  <Reveal key={step} variant="up" delay={i * 150}>
                    <div className={`relative h-full rounded-2xl border ${border} ${bg} p-7 backdrop-blur-sm tilt-lift`}>
                      <span className={`text-5xl font-black ${color} opacity-40`}>{step}</span>
                      <h3 className="mt-3 text-lg font-bold text-white">{title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-white/55">{desc}</p>
                      <Link href={href} className={`mt-5 inline-flex items-center gap-1 text-xs font-semibold ${color}`}>
                        {cta} <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </Reveal>
                ))}
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                COMMUNITY GALLERY — marquee
            ═══════════════════════════════════════════════════════════════ */}
            <section className="mt-28">
              <Reveal variant="up">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Community</p>
                    <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">
                      See What People <span className="aurora-text">Create.</span>
                    </h2>
                    <p className="mt-2 max-w-lg text-base text-white/55">
                      Real creations from our community — uncensored, unrestricted, and entirely theirs.
                    </p>
                  </div>
                  <Link href="/community" className="shrink-0 inline-flex items-center gap-1 text-sm font-semibold text-white/60 transition hover:text-white">
                    View community <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </Reveal>

              <div className="relative mt-8 overflow-hidden">
                <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-16 bg-gradient-to-r from-[#0a0a0f] to-transparent" />
                <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 bg-gradient-to-l from-[#0a0a0f] to-transparent" />

                <div className="marquee-track gap-3" style={{ width: 'max-content' }}>
                  {[...COMMUNITY_IMAGES_ROW_1, ...COMMUNITY_IMAGES_ROW_1].map((src, idx) => (
                    <div
                      key={`row1-${idx}`}
                      className="relative mx-1.5 h-64 w-48 shrink-0 overflow-hidden rounded-2xl border border-white/8 bg-[#0d0d15]"
                    >
                      <Image
                        src={src}
                        alt="AI-generated artwork from the Veloura.ai community"
                        fill
                        sizes="192px"
                        loading="lazy"
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative mt-3 overflow-hidden">
                <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-16 bg-gradient-to-r from-[#0a0a0f] to-transparent" />
                <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 bg-gradient-to-l from-[#0a0a0f] to-transparent" />

                <div className="marquee-track-reverse gap-3" style={{ width: 'max-content' }}>
                  {[...COMMUNITY_IMAGES_ROW_2, ...COMMUNITY_IMAGES_ROW_2].map((src, idx) => (
                    <div
                      key={`row2-${idx}`}
                      className="relative mx-1.5 h-64 w-48 shrink-0 overflow-hidden rounded-2xl border border-white/8 bg-[#0d0d15]"
                    >
                      <Image
                        src={src}
                        alt="AI-generated artwork from the Veloura.ai community"
                        fill
                        sizes="192px"
                        loading="lazy"
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                PRIVACY + TRUST
            ═══════════════════════════════════════════════════════════════ */}
            <section className="mt-28">
              <Reveal variant="up">
                <div className="rounded-3xl border border-white/8 bg-gradient-to-br from-[#0d0d15] via-[#0a0a0f] to-[#0d0d15] p-8 sm:p-12">
                  <div className="grid gap-8 sm:grid-cols-3">
                    {[
                      { icon: <Shield className="h-6 w-6 text-[#ff3e8a]" />, title: 'Your Privacy is Sacred', desc: 'Your conversations, your generated content and your data never leave our secure servers. We share nothing with third parties.' },
                      { icon: <Sparkles className="h-6 w-6 text-[#a855f7]" />, title: 'No Judgement. Ever.', desc: 'Built for adults who want a real AI experience. Whatever you create or explore here — it stays between you and your AI.' },
                      { icon: <InfinityIcon className="h-6 w-6 text-[#ff3e8a]" />, title: 'Always Free to Start', desc: 'Create your companion and start chatting at zero cost. No credit card, no trial timer, no bait-and-switch. Free means free.' },
                    ].map(({ icon, title, desc }, i) => (
                      <Reveal key={title} variant="up" delay={i * 120}>
                        <div className="flex h-full flex-col gap-3">
                          <div className="w-fit rounded-xl border border-white/10 bg-white/5 p-2.5">{icon}</div>
                          <h3 className="text-base font-bold text-white">{title}</h3>
                          <p className="text-sm leading-relaxed text-white/55">{desc}</p>
                        </div>
                      </Reveal>
                    ))}
                  </div>
                </div>
              </Reveal>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                FAQ
            ═══════════════════════════════════════════════════════════════ */}
            <section className="mt-28">
              <Reveal variant="up">
                <div className="text-center">
                  <h2 className="text-3xl font-black text-white sm:text-4xl">Frequently Asked Questions</h2>
                  <p className="mt-3 text-base text-white/55">Everything you need to know before you start.</p>
                </div>
              </Reveal>

              <div className="mt-10 space-y-2.5">
                {FAQ_ITEMS.map(({ q, a }, i) => (
                  <Reveal key={q} variant="up" delay={i * 60}>
                    <details className="group rounded-2xl border border-white/8 bg-[#0d0d15] transition hover:border-white/15">
                      <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 text-sm font-semibold text-white select-none marker:hidden">
                        {q}
                        <span className="ml-4 shrink-0 text-[#ff3e8a] transition-transform duration-200 group-open:rotate-45">+</span>
                      </summary>
                      <p className="border-t border-white/8 px-6 pb-5 pt-4 text-sm leading-relaxed text-white/55">{a}</p>
                    </details>
                  </Reveal>
                ))}
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                FINAL CTA
            ═══════════════════════════════════════════════════════════════ */}
            <section className="relative mb-8 mt-28 overflow-hidden rounded-3xl">
              <div className="absolute inset-0 bg-gradient-to-br from-[#ff3e8a]/25 via-[#a855f7]/18 to-[#0a0a0f]" />
              <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-[#ff3e8a]/25 blur-3xl mesh-drift" />
              <div className="pointer-events-none absolute -bottom-10 right-10 h-44 w-44 rounded-full bg-[#a855f7]/25 blur-3xl mesh-drift" style={{ animationDelay: '-7s' }} />

              <Reveal variant="scale">
                <div className="relative px-6 py-12 text-center sm:px-16 sm:py-14">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ff3e8a]">Start Free Today</p>
                  <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl lg:text-5xl leading-[1.05]">
                    Your AI World <span className="aurora-text">is Waiting.</span>
                  </h2>
                  <p className="mt-4 mx-auto max-w-md text-sm text-white/70 sm:text-base">
                    No credit card. No content filters. No restrictions. Just you — and the companion, image, video or fantasy you&rsquo;ve always wanted.
                  </p>
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <Link
                      href="/ai-partner-lobby"
                      className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-[#ff3e8a] px-7 py-3 text-sm font-bold text-white shadow-xl shadow-[#ff3e8a]/30 transition hover:bg-[#ff3e8a]/90 hover:shadow-[#ff3e8a]/60 shine-on-hover"
                    >
                      Meet Your AI Partner <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                    <Link
                      href="/create-your-own-ai-character"
                      className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-7 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-white/40 hover:bg-white/10"
                    >
                      Create Your AI Girlfriend
                    </Link>
                  </div>
                  <p className="mt-5 text-xs text-white/40">Free plan available · No credit card required · Start in under 2 minutes</p>
                </div>
              </Reveal>
            </section>

          </div>
          <Footer />
        </main>
      </div>
    </SidebarProvider>
  );
}
