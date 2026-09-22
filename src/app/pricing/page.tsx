import Link from 'next/link';
import { ArrowRight, Check, Shield, Sparkles, MessageCircle, Image as ImageIcon, Video, Mic } from 'lucide-react';
import Footer from '@/components/Footer';
import FAQSchema from '@/components/seo/FAQSchema';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { prisma } from '@/lib/db';
import PricingCards from './PricingCards';

// Re-fetch plan data at most hourly — balances fresh pricing with low DB load.
// If you ship a price change, revalidatePath('/pricing') flushes immediately.
export const revalidate = 3600;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

const BREADCRUMB = [
  { name: 'Home', url: APP_URL },
  { name: 'Pricing', url: `${APP_URL}/pricing` },
];

const FAQ_ITEMS = [
  {
    q: 'How much does Veloura.ai cost?',
    a: 'Veloura.ai has a free plan with no credit card required. Paid plans start with Basic and scale up to Premium and Enterprise, unlocking more credits, companions, chat tokens, and LoRA training. Annual billing saves up to 76% versus monthly.',
  },
  {
    q: 'Is there a free AI girlfriend plan?',
    a: 'Yes. The free plan includes AI girlfriend chat, image generation trials, and companion browsing — no credit card required. Free accounts have a daily message allowance with full NSFW content support.',
  },
  {
    q: 'Do I need a credit card to try Veloura.ai?',
    a: 'No. You can sign up and start chatting for free without providing payment details. A card is only required when you choose to upgrade to a paid plan.',
  },
  {
    q: 'What is the difference between credits and tokens?',
    a: 'Credits are your monthly allowance for premium actions (image generation, video, voice cloning, LoRA training). Tokens are used for chat messages. Each paid plan converts credits to chat tokens at a generous rate — Premium plans include unlimited or near-unlimited chat.',
  },
  {
    q: 'Can I cancel my subscription anytime?',
    a: 'Yes. Cancel anytime from your subscription page. You keep access until the end of your current billing period, and there are no cancellation fees. You can also pause your plan for a month instead of cancelling.',
  },
  {
    q: 'Do unused credits roll over?',
    a: 'On paid plans, unused credits roll over up to a per-plan cap (shown in the comparison table). Rollover resets when you downgrade or cancel.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'All major credit and debit cards via Stripe. Billing is discreetly labelled on statements as UAI.ai for privacy.',
  },
  {
    q: 'Is it cheaper to pay annually?',
    a: 'Yes — annual billing saves 40% on Pro, 66% on Premium, and 76% on Enterprise versus paying monthly. You can switch billing cycles anytime.',
  },
  {
    q: 'Do paid plans include uncensored content?',
    a: 'All plans — including the free plan — have zero content filters. Paid plans simply unlock higher volumes, better models, voice cloning, custom LoRA training, and unlimited chat.',
  },
  {
    q: 'Can I upgrade or downgrade my plan?',
    a: 'Yes, anytime. Upgrades are prorated — you only pay the difference for the remaining billing period. Downgrades take effect at the end of your current period.',
  },
];

const WHO_IS_THIS_FOR = [
  {
    title: 'Casual Chatter',
    plan: 'Free / Basic',
    who: 'You want to chat with an AI girlfriend and occasionally generate images, no filters, no commitment.',
    fit: ['Daily NSFW chat', 'Occasional image generation', 'Try before you buy'],
    icon: MessageCircle,
  },
  {
    title: 'Power User',
    plan: 'Pro / Premium',
    who: 'You want unlimited chat, heavy NSFW image generation, voice cloning, and AI video.',
    fit: ['Unlimited NSFW chat', 'Heavy image generation', 'Voice cloning & AI video'],
    icon: Sparkles,
  },
  {
    title: 'Creator',
    plan: 'Premium / Enterprise',
    who: 'You train custom LoRAs, produce consistent characters, and need commercial-grade generation volume.',
    fit: ['Custom LoRA training', 'Commercial-grade volume', 'Consistent character IP'],
    icon: Shield,
  },
];

const INCLUDED_FEATURES = [
  { icon: MessageCircle, label: 'Uncensored AI Chat', desc: 'Zero filters, explicit roleplay, persistent memory.' },
  { icon: ImageIcon, label: 'NSFW Image Generation', desc: 'Flux, SDXL, Pony, Illustrious — photorealistic & anime.' },
  { icon: Video, label: 'AI Video Generation', desc: 'Text-to-video, deepfake, motion transfer (paid).' },
  { icon: Mic, label: 'Voice Cloning', desc: 'Clone any voice; hear your companion speak (paid).' },
  { icon: Sparkles, label: 'LoRA Training', desc: 'Train custom character LoRAs in ~10 minutes (paid).' },
  { icon: Shield, label: 'Zero Content Filters', desc: 'No blocked topics. Any scenario. Any explicitness.' },
];

const TESTIMONIALS = [
  {
    quote:
      'I tried every "uncensored" AI app — most had hidden filters. Veloura.ai is the only one that actually delivers. Premium is genuinely unlimited.',
    author: 'Ryan M.',
    role: 'Premium subscriber, 8 months',
  },
  {
    quote:
      'Free plan is genuinely free — no credit card, no sneaky trial. I upgraded to Pro after a week because the image quality on Flux is stupid good.',
    author: 'Alex T.',
    role: 'Pro subscriber',
  },
  {
    quote:
      'LoRA training in 10 minutes is insane. I trained my companion\'s face once and now every image is the same person. Worth Premium alone.',
    author: 'Jordan K.',
    role: 'Premium subscriber, 4 months',
  },
];

async function getPlans() {
  try {
    const plans = await prisma.planConfig.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    // Normalize for the client — only send what the pricing grid needs, and flatten Json features field
    return plans
      .filter((p) => p.planKey !== 'FREE')
      .map((p) => ({
        id: p.id,
        planKey: p.planKey,
        name: p.name,
        monthlyPrice: p.monthlyPrice,
        annualPrice: p.annualPrice,
        monthlyCredits: p.monthlyCredits,
        maxCompanions: p.maxCompanions,
        creditRollover: p.creditRollover,
        tokensPerCredit: p.tokensPerCredit,
        dailyTokenLimit: p.dailyTokenLimit,
        features: Array.isArray(p.features) ? (p.features as string[]) : [],
        isRecommended: p.isRecommended,
      }));
  } catch (error) {
    console.error('[Pricing] Failed to load plans:', error);
    return [];
  }
}

function formatTokenBudget(monthlyCredits: number, tokensPerCredit: number, dailyTokenLimit: number): string {
  if (dailyTokenLimit > 0) return `${dailyTokenLimit.toLocaleString()} tokens/day`;
  if (tokensPerCredit === 0) return 'Unlimited';
  const total = monthlyCredits * tokensPerCredit;
  if (total >= 1_000_000) return `~${Math.round(total / 1_000_000)}M / mo`;
  if (total >= 1_000) return `~${Math.round(total / 1_000)}K / mo`;
  return `${total.toLocaleString()} / mo`;
}

export default async function PricingPage() {
  const plans = await getPlans();

  // Product schema — unlocks Google "Product" rich result with price ranges in SERPs.
  // Offer entries are generated from the live plan data so SERP snippets stay in sync with the page.
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Veloura.ai',
    description:
      'The uncensored AI companion platform — AI girlfriend chat, NSFW image generation, AI video, voice cloning, and LoRA training. Free to start.',
    brand: { '@type': 'Brand', name: 'Veloura.ai' },
    image: 'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/og-images/og-pricing.png',
    offers: plans.length > 0
      ? {
          '@type': 'AggregateOffer',
          priceCurrency: 'USD',
          lowPrice: Math.min(...plans.map((p) => p.monthlyPrice)),
          highPrice: Math.max(...plans.map((p) => p.monthlyPrice)),
          offerCount: plans.length,
          availability: 'https://schema.org/InStock',
          url: `${APP_URL}/pricing`,
        }
      : undefined,
  };

  return (
    <div className="content-wrapper">
      <FAQSchema items={FAQ_ITEMS} />
      <BreadcrumbSchema items={BREADCRUMB} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />

      {/* ─── Hero ───────────────────────────────────────────── */}
      <section className="relative mt-6 overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a0f] px-6 py-14 sm:px-12 sm:py-20">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#ff3e8a]/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-[#a855f7]/20 blur-3xl" />

        <div className="relative mx-auto max-w-3xl text-center">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#ff3e8a]/30 bg-[#ff3e8a]/10 px-3 py-1 text-xs font-semibold text-[#ff3e8a]">
            ✦ Free plan — no credit card required
          </span>
          <h1 className="text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
            AI Girlfriend Pricing
            <br />
            <span className="bg-gradient-to-r from-[#ff3e8a] via-[#a855f7] to-[#ff8c42] bg-clip-text text-transparent">
              Simple. No Filters. No Tricks.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
            Start free with no credit card. Upgrade when you want unlimited uncensored chat, heavy NSFW image
            generation, AI video, voice cloning, and custom LoRA training. Cancel anytime — no lock-in, no sneaky
            renewals.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-[#ff3e8a] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#ff3e8a]/30 transition hover:bg-[#ff3e8a]/90"
            >
              Start Free <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="#plans"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              See Plans
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-white/50">
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-400" /> No credit card
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-400" /> Cancel anytime
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-400" /> Discreet billing
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-400" /> Zero filters
            </span>
          </div>
        </div>
      </section>

      {/* ─── Plan cards ─────────────────────────────────────── */}
      <section id="plans" className="mt-16">
        <div className="text-center">
          <h2 className="text-3xl font-black text-white sm:text-4xl">Choose Your Plan</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-white/60">
            Every plan — even free — has zero content filters. Paid tiers unlock volume, voice, video, and LoRA.
          </p>
        </div>

        {plans.length > 0 ? (
          <PricingCards plans={plans} />
        ) : (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/60">
            Plan details are temporarily unavailable.{' '}
            <Link href="/register" className="font-semibold text-[#ff3e8a] underline">
              Sign up free
            </Link>{' '}
            to get started — you can always pick a plan later.
          </div>
        )}
      </section>

      {/* ─── What's included (feature grid) ─────────────────── */}
      <section className="mt-20">
        <div className="text-center">
          <h2 className="text-3xl font-black text-white sm:text-4xl">What Every Plan Includes</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-white/60">
            The core uncensored AI experience is on every plan — paid tiers just raise the volume.
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INCLUDED_FEATURES.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-[#0a0a0f] p-5">
              <Icon className="h-6 w-6 text-[#ff3e8a]" aria-hidden="true" />
              <h3 className="mt-3 text-base font-semibold text-white">{label}</h3>
              <p className="mt-1 text-sm text-white/60">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Who's this for ─────────────────────────────────── */}
      <section className="mt-20">
        <div className="text-center">
          <h2 className="text-3xl font-black text-white sm:text-4xl">Which Plan Fits You?</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-white/60">
            Not sure where to start? Pick the profile that sounds most like you.
          </p>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {WHO_IS_THIS_FOR.map(({ title, plan, who, fit, icon: Icon }) => (
            <div
              key={title}
              className="flex flex-col rounded-2xl border border-white/10 bg-[#0a0a0f] p-6"
            >
              <Icon className="h-6 w-6 text-[#ff3e8a]" aria-hidden="true" />
              <h3 className="mt-3 text-lg font-semibold text-white">{title}</h3>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[#ff3e8a]">Best plan: {plan}</p>
              <p className="mt-3 text-sm text-white/70">{who}</p>
              <ul className="mt-4 space-y-1.5 text-sm text-white/60">
                {fit.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" aria-hidden="true" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Plan comparison table (SSR'd for crawlers) ─────── */}
      {plans.length > 0 && (
        <section className="mt-20 rounded-2xl border border-white/10 bg-[#0a0a0f] p-6 sm:p-8">
          <div className="text-center">
            <h2 className="text-3xl font-black text-white sm:text-4xl">Full Plan Comparison</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-white/60">Compare every feature side by side.</p>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-[720px] w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 border border-white/10 bg-white/5 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/50">
                    Feature
                  </th>
                  {plans.map((plan) => (
                    <th
                      key={plan.id}
                      className="border border-white/10 bg-white/5 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/70"
                    >
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Monthly price', values: plans.map((p) => `$${p.monthlyPrice.toFixed(2)}/mo`) },
                  {
                    label: 'Annual price',
                    values: plans.map((p) => (p.annualPrice > 0 ? `$${p.annualPrice.toFixed(2)}/mo` : '—')),
                  },
                  { label: 'Monthly credits', values: plans.map((p) => `${p.monthlyCredits.toLocaleString()} / mo`) },
                  {
                    label: 'Chat tokens',
                    values: plans.map((p) =>
                      formatTokenBudget(p.monthlyCredits, p.tokensPerCredit ?? 0, p.dailyTokenLimit ?? 0)
                    ),
                  },
                  {
                    label: 'AI companions',
                    values: plans.map((p) => (p.maxCompanions === -1 ? 'Unlimited' : String(p.maxCompanions))),
                  },
                  {
                    label: 'Credit rollover',
                    values: plans.map((p) => (p.creditRollover > 0 ? `Up to ${p.creditRollover.toLocaleString()}` : '—')),
                  },
                  { label: 'NSFW image generation', values: plans.map(() => 'Yes — unlimited models') },
                  { label: 'AI video generation', values: plans.map(() => 'Yes') },
                  { label: 'Voice cloning', values: plans.map(() => 'Yes') },
                  { label: 'LoRA training', values: plans.map(() => 'Yes') },
                  { label: 'Content filters', values: plans.map(() => 'None — zero filters') },
                  { label: 'Cancel anytime', values: plans.map(() => 'Yes') },
                ].map((row) => (
                  <tr key={row.label}>
                    <td className="sticky left-0 z-10 border border-white/10 bg-[#0a0a0f] px-4 py-3 font-medium text-white">
                      {row.label}
                    </td>
                    {row.values.map((value, i) => (
                      <td key={`${row.label}-${i}`} className="border border-white/10 bg-[#0a0a0f] px-4 py-3 text-white/70">
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ─── Testimonials ───────────────────────────────────── */}
      <section className="mt-20">
        <div className="text-center">
          <h2 className="text-3xl font-black text-white sm:text-4xl">What Subscribers Say</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-white/60">Real feedback from paid users.</p>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map(({ quote, author, role }) => (
            <blockquote
              key={author}
              className="flex flex-col rounded-2xl border border-white/10 bg-[#0a0a0f] p-6"
            >
              <p className="text-sm leading-relaxed text-white/80">&ldquo;{quote}&rdquo;</p>
              <footer className="mt-5 border-t border-white/10 pt-4">
                <p className="text-sm font-semibold text-white">{author}</p>
                <p className="text-xs text-white/50">{role}</p>
              </footer>
            </blockquote>
          ))}
        </div>
      </section>

      {/* ─── FAQ (visible + matches JSON-LD) ────────────────── */}
      <section className="mt-20">
        <div className="text-center">
          <h2 className="text-3xl font-black text-white sm:text-4xl">Pricing FAQ</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-white/60">Questions about plans, billing, and what you get.</p>
        </div>
        <div className="mx-auto mt-8 max-w-3xl space-y-3">
          {FAQ_ITEMS.map(({ q, a }) => (
            <details
              key={q}
              className="group rounded-2xl border border-white/10 bg-[#0a0a0f] p-5 open:border-[#ff3e8a]/30"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between text-left text-sm font-semibold text-white">
                {q}
                <span className="ml-3 text-white/40 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-white/70">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ─── Final CTA ──────────────────────────────────────── */}
      <section className="mt-20 mb-12 overflow-hidden rounded-3xl border border-[#ff3e8a]/30 bg-gradient-to-br from-[#ff3e8a]/15 via-[#0a0a0f] to-[#a855f7]/15 p-10 text-center sm:p-16">
        <h2 className="text-3xl font-black text-white sm:text-4xl">Start Free. Upgrade When You're Ready.</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-white/70 sm:text-base">
          No credit card. No trial games. Create your account and start chatting in under 60 seconds.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-[#ff3e8a] px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#ff3e8a]/30 transition hover:bg-[#ff3e8a]/90"
          >
            Create Free Account <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/ai-partner-lobby"
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Browse Companions
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
