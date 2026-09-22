export const dynamic = 'force-static';
export const revalidate = 86400;

import Image from 'next/image';
import Link from 'next/link';
import Footer from '@/components/Footer';

const POSTS = [
  {
    slug: 'best-nsfw-ai-chat',
    title: 'Best NSFW AI Chat — Free, Uncensored (2026)',
    description: 'The top NSFW AI chat platforms compared. Find the best uncensored AI chat bot with no content filters, free access, and the most realistic AI companions.',
    category: 'Comparison',
    readTime: '7 min',
    img: 'https://images.unsplash.com/photo-1577563908411-5077b6dc7624?auto=format&fit=crop&w=600&q=80',
    hot: true,
  },
  {
    slug: 'best-uncensored-ai',
    title: 'Best Uncensored AI Tools in 2026 — Chat, Images & Video',
    description: 'A complete guide to the best uncensored AI platforms rated by content freedom, features, and price.',
    category: 'Guide',
    readTime: '8 min',
    img: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80',
    hot: false,
  },
  {
    slug: 'character-ai-alternative-no-filter',
    title: 'Character AI Alternative No Filter — Top 5 Picks (2026)',
    description: 'The best Character AI alternatives with no content filters. Detailed comparison for uncensored NSFW roleplay.',
    category: 'Comparison',
    readTime: '6 min',
    img: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&w=600&q=80',
    hot: true,
  },
  {
    slug: 'how-to-train-a-lora',
    title: 'How to Train a LoRA Model — Complete Beginner\'s Guide',
    description: 'Step-by-step LoRA training guide. From dataset preparation to model deployment — no prior AI experience needed.',
    category: 'Tutorial',
    readTime: '10 min',
    img: 'https://images.unsplash.com/photo-1555255707-c07966088b7b?auto=format&fit=crop&w=600&q=80',
    hot: false,
  },
  {
    slug: 'fluxgym-lora-training',
    title: 'FluxGym LoRA Training — Step-by-Step Tutorial',
    description: 'Complete FluxGym tutorial for training Flux LoRA models for your AI character or girlfriend.',
    category: 'Tutorial',
    readTime: '8 min',
    img: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80',
    hot: false,
  },
  {
    slug: 'how-to-train-wan-2-2-lora',
    title: 'How to Train a WAN 2.2 LoRA — Full Walkthrough',
    description: 'Complete guide to training a WAN 2.2 LoRA for AI video generation — from dataset prep to generating your first character video.',
    category: 'Tutorial',
    readTime: '9 min',
    img: 'https://images.unsplash.com/photo-1536240478700-b869ad10e128?auto=format&fit=crop&w=600&q=80',
    hot: false,
  },
];

const CATEGORY_STYLES: Record<string, string> = {
  Comparison: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  Guide: 'bg-green-500/15 text-green-300 border-green-500/20',
  Tutorial: 'bg-purple-500/15 text-purple-300 border-purple-500/20',
};

export default function BlogIndexPage() {
  return (
    <div className="content-wrapper">

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <div className="mt-6 mb-14">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ff3e8a]/30 bg-[#ff3e8a]/10 px-3 py-1 text-xs font-semibold text-[#ff3e8a]">
          ✦ Guides &amp; Tutorials
        </span>
        <h1 className="mt-4 text-3xl font-black text-white sm:text-4xl">
          Veloura.ai{' '}
          <span className="bg-gradient-to-r from-[#ff3e8a] to-orange-400 bg-clip-text text-transparent">
            Blog
          </span>
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/60">
          Guides, tutorials, and comparisons for AI girlfriend apps, NSFW AI tools, LoRA
          model training, and uncensored AI generation. Everything you need to get the most
          out of AI companions and creative AI tools.
        </p>
      </div>

      {/* ── Featured post ─────────────────────────────────────────────────────── */}
      <div className="mb-10">
        <Link href={`/blog/${POSTS[0].slug}`} className="group relative flex overflow-hidden rounded-3xl border border-white/10 bg-[#12121a] transition-all hover:border-[#ff3e8a]/40 hover:shadow-[0_0_30px_rgba(255,62,138,0.1)] sm:flex-row">
          <div className="relative h-48 w-full shrink-0 sm:h-auto sm:w-80">
            <Image
              src={POSTS[0].img}
              alt={POSTS[0].title}
              fill
              className="object-cover opacity-70 transition-all group-hover:opacity-90 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#12121a] hidden sm:block" />
          </div>
          <div className="flex flex-col justify-center p-7">
            <div className="flex items-center gap-2 mb-3">
              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${CATEGORY_STYLES[POSTS[0].category]}`}>
                {POSTS[0].category}
              </span>
              <span className="text-xs text-white/30">{POSTS[0].readTime} read</span>
              {POSTS[0].hot && (
                <span className="rounded-full bg-[#ff3e8a]/10 border border-[#ff3e8a]/20 px-2 py-0.5 text-xs font-semibold text-[#ff3e8a]">🔥 Hot</span>
              )}
            </div>
            <h2 className="text-xl font-black text-white leading-snug group-hover:text-[#ff3e8a] transition-colors sm:text-2xl">
              {POSTS[0].title}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/50">{POSTS[0].description}</p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#ff3e8a]">
              Read Article →
            </span>
          </div>
        </Link>
      </div>

      {/* ── Grid ──────────────────────────────────────────────────────────────── */}
      <div className="mb-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {POSTS.slice(1).map(({ slug, title, description, category, readTime, img, hot }) => (
          <Link
            key={slug}
            href={`/blog/${slug}`}
            className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#12121a] transition-all hover:border-[#ff3e8a]/40 hover:shadow-[0_0_20px_rgba(255,62,138,0.08)]"
          >
            {/* Card image */}
            <div className="relative h-40 overflow-hidden">
              <Image
                src={img}
                alt={title}
                fill
                className="object-cover opacity-60 transition-all group-hover:opacity-80 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#12121a] via-transparent to-transparent" />
              {hot && (
                <span className="absolute left-3 top-3 rounded-full bg-[#ff3e8a]/90 px-2 py-0.5 text-xs font-bold text-white">
                  🔥 Hot
                </span>
              )}
            </div>
            {/* Card body */}
            <div className="flex flex-1 flex-col p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${CATEGORY_STYLES[category]}`}>
                  {category}
                </span>
                <span className="text-xs text-white/30">{readTime} read</span>
              </div>
              <h2 className="text-sm font-bold text-white leading-snug group-hover:text-[#ff3e8a] transition-colors">
                {title}
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-white/40 flex-1">{description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#ff3e8a]">
                Read Article →
              </span>
            </div>
          </Link>
        ))}
      </div>

      <Footer />
    </div>
  );
}
