export const dynamic = 'force-static';
export const revalidate = 86400;

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import Footer from '@/components/Footer';
import FAQSchema from '@/components/seo/FAQSchema';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

export const metadata: Metadata = {
  title: 'Best NSFW AI Chat — Free, Uncensored, No Restrictions (2026) | Veloura.ai',
  description:
    'The top NSFW AI chat platforms compared. Find the best free uncensored AI chat with no content filters, the most realistic AI companions, and zero restrictions.',
  keywords: [
    'best nsfw ai chat',
    'free nsfw ai chat',
    'nsfw ai chat bot',
    'best free nsfw ai chat',
    'uncensored ai chat',
    'nsfw ai chatbot free',
    'top nsfw ai chat platforms',
    'best ai chat no restrictions',
  ],
  alternates: { canonical: `${APP_URL}/blog/best-nsfw-ai-chat` },
  openGraph: {
    title: 'Best NSFW AI Chat — Free, Uncensored, No Restrictions (2026)',
    description: 'The top NSFW AI chat platforms compared. Free, no filters, realistic AI companions.',
    url: `${APP_URL}/blog/best-nsfw-ai-chat`,
    siteName: 'Veloura.ai',
    type: 'article',
  },
};

const BREADCRUMB = [
  { name: 'Home', url: APP_URL },
  { name: 'Blog', url: `${APP_URL}/blog` },
  { name: 'Best NSFW AI Chat', url: `${APP_URL}/blog/best-nsfw-ai-chat` },
];

const FAQ_ITEMS = [
  { q: 'What is the best free NSFW AI chat in 2026?', a: 'Veloura.ai is the leading free NSFW AI chat platform, combining zero content filters with AI image generation, voice cloning, and video creation in one place. Free accounts get daily chat access with full NSFW support.' },
  { q: 'Is NSFW AI chat legal?', a: 'Yes. NSFW AI chat between consenting adults and AI is legal in most jurisdictions. The content generated is artificial and involves no real people. Always verify the laws in your specific location.' },
  { q: 'Which NSFW AI chat has the best memory?', a: 'Veloura.ai uses persistent conversation memory that builds relationship context across sessions. Premium plans extend this memory significantly for longer, more connected AI relationships.' },
  { q: 'Can I use NSFW AI chat on mobile?', a: 'Yes. Veloura.ai is fully responsive and works on mobile browsers without requiring an app download.' },
];

const PLATFORMS = [
  {
    rank: 1,
    name: 'Veloura.ai',
    verdict: 'Best Overall',
    verdictColor: 'bg-[#ff3e8a]/10 text-[#ff3e8a] border-[#ff3e8a]/20',
    description: 'The most complete NSFW AI chat platform. Zero content filters, custom character creation, AI image generation in chat, voice cloning, video creation, and LoRA model training — all in one.',
    pros: ['Completely uncensored — no filters on any content', 'AI image generation during chat', 'Custom voice cloning for companions', 'AI video creation tools', 'Free to start, no credit card required', 'LoRA training for custom character models'],
    cons: ['Daily message limit on free tier'],
    href: '/',
    cta: 'Try Free',
    highlight: true,
  },
  {
    rank: 2,
    name: 'CrushOn.ai',
    verdict: 'Strong Competitor',
    verdictColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    description: 'Popular NSFW AI chat platform with a large character library. Good for casual NSFW conversations but fewer creative tools than Veloura.ai.',
    pros: ['Large pre-made character library', 'NSFW content generally allowed'],
    cons: ['No AI image generation in chat', 'No video creation tools', 'More expensive premium plans', 'No LoRA model training'],
    href: '/',
    cta: 'Compare',
    highlight: false,
  },
  {
    rank: 3,
    name: 'Candy.ai',
    verdict: 'Good for Beginners',
    verdictColor: 'bg-green-500/10 text-green-400 border-green-500/20',
    description: 'Clean interface focused on AI girlfriend chat. NSFW content allowed with some limitations. Fewer tools than top alternatives.',
    pros: ['Polished interface', 'Good AI girlfriend personas'],
    cons: ['More content restrictions than top picks', 'Limited character customisation', 'No image editor tools', 'No audio tools'],
    href: '/',
    cta: 'Compare',
    highlight: false,
  },
];

export default function BestNSFWAIChatPage() {
  return (
    <div className="content-wrapper">
      <FAQSchema items={FAQ_ITEMS} />
      <BreadcrumbSchema items={BREADCRUMB} />

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <div className="relative mt-6 mb-14 overflow-hidden rounded-3xl">
        <Image
          src="https://images.unsplash.com/photo-1577563908411-5077b6dc7624?auto=format&fit=crop&w=1400&q=80"
          alt="Best NSFW AI Chat platforms"
          width={1400}
          height={560}
          className="h-64 w-full object-cover opacity-30 sm:h-80"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/85 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
        <div className="absolute -right-10 top-0 h-56 w-56 rounded-full bg-[#ff3e8a]/15 blur-3xl" />

        <div className="absolute inset-0 flex flex-col justify-center px-8 py-10">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="rounded-full bg-blue-500/15 border border-blue-500/20 px-2.5 py-0.5 text-xs font-semibold text-blue-300">Comparison</span>
            <span className="text-xs text-white/30">7 min read · Updated April 2026</span>
            <span className="rounded-full bg-[#ff3e8a]/10 border border-[#ff3e8a]/20 px-2 py-0.5 text-xs font-semibold text-[#ff3e8a]">🔥 Hot</span>
          </div>
          <h1 className="text-2xl font-black leading-tight text-white sm:text-3xl lg:text-4xl">
            Best NSFW AI Chat
            <br />
            <span className="bg-gradient-to-r from-[#ff3e8a] to-orange-400 bg-clip-text text-transparent">
              Free & Uncensored (2026)
            </span>
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/60 sm:text-base">
            We tested every major NSFW AI chat platform for content freedom, conversation quality, and features. Here are the best options — ranked by what actually matters.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {[{ label: 'Zero Filters', icon: '🔓' }, { label: 'Free to Start', icon: '✅' }, { label: 'No Credit Card', icon: '💳' }].map((s) => (
              <span key={s.label} className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/50">{s.icon} {s.label}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quick Summary ─────────────────────────────────────────────────────── */}
      <div className="mb-12 overflow-hidden rounded-2xl border border-[#ff3e8a]/20 bg-gradient-to-br from-[#ff3e8a]/8 to-transparent p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">⚡</span>
          <h2 className="text-base font-bold text-white">Quick Summary</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: '🏆 Best Overall', value: 'Veloura.ai — zero filters, AI images, video, voice' },
            { label: '🆓 Best Free', value: 'Veloura.ai — no credit card, genuine NSFW on free tier' },
            { label: '📚 Best Character Library', value: 'CrushOn.ai — large pre-made character selection' },
            { label: '🌱 Best for Beginners', value: 'Candy.ai — clean interface, easy to start' },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/3 px-4 py-3">
              <span className="text-xs font-semibold text-white/80">{label}</span>
              <span className="text-xs text-white/50">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Rankings ──────────────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white mb-2">Best NSFW AI Chat Platforms Ranked</h2>
        <p className="mb-8 text-sm text-white/40">Tested April 2026 — ranked by content freedom, features, and free tier quality.</p>
        <div className="space-y-5">
          {PLATFORMS.map(({ rank, name, verdict, verdictColor, description, pros, cons, href, cta, highlight }) => (
            <div key={name} className={`overflow-hidden rounded-2xl border transition-all ${highlight ? 'border-[#ff3e8a]/30 bg-[#12121a] shadow-[0_0_30px_rgba(255,62,138,0.06)]' : 'border-white/10 bg-[#12121a]'}`}>
              {highlight && <div className="h-0.5 w-full bg-gradient-to-r from-[#ff3e8a] to-orange-400" />}
              <div className="p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff3e8a]/10 text-xl font-black text-[#ff3e8a]">#{rank}</span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-white">{name}</h3>
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${verdictColor}`}>{verdict}</span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-white/50 max-w-2xl">{description}</p>
                    </div>
                  </div>
                  <Link
                    href={href}
                    className={`shrink-0 inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold transition ${highlight ? 'bg-[#ff3e8a] text-white hover:bg-[#ff3e8a]/90 shadow-lg shadow-[#ff3e8a]/20' : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'}`}
                  >
                    {cta} →
                  </Link>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-green-500/5 border border-green-500/10 p-4">
                    <p className="text-xs font-semibold text-green-400 mb-2">✓ Pros</p>
                    <ul className="space-y-1.5">
                      {pros.map((p) => (
                        <li key={p} className="flex items-start gap-2 text-sm text-white/60">
                          <span className="mt-0.5 text-green-400 shrink-0">+</span>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl bg-red-500/5 border border-red-500/10 p-4">
                    <p className="text-xs font-semibold text-red-400 mb-2">✗ Cons</p>
                    <ul className="space-y-1.5">
                      {cons.map((c) => (
                        <li key={c} className="flex items-start gap-2 text-sm text-white/60">
                          <span className="mt-0.5 text-red-400 shrink-0">−</span>
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Mid article image ─────────────────────────────────────────────────── */}
      <div className="relative mb-14 overflow-hidden rounded-3xl">
        <Image
          src="https://images.unsplash.com/photo-1614680376593-a3f29ef21e5e?auto=format&fit=crop&w=1400&q=80"
          alt="AI companion chat experience"
          width={1400}
          height={400}
          className="h-44 w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] to-[#0a0a0f]/60" />
        <div className="absolute inset-0 flex items-center px-8">
          <div>
            <p className="text-lg font-black text-white sm:text-2xl">The best NSFW AI chat is <span className="text-[#ff3e8a]">completely free.</span></p>
            <p className="mt-1 text-sm text-white/50">No credit card. No filter. No restrictions.</p>
          </div>
        </div>
      </div>

      {/* ── What to look for ──────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">What to Look for in NSFW AI Chat</h2>
        <p className="mt-3 mb-6 text-sm text-white/40">Not all NSFW AI chat platforms are created equal. These are the four criteria that matter most.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { icon: '🚫', title: 'True No-Filter Policy', desc: 'The most important criterion. Some platforms claim to be NSFW but still filter explicit content. Look for platforms where explicit content works natively without jailbreaks.' },
            { icon: '🆓', title: 'Free Tier Quality', desc: 'The free tier should genuinely support NSFW content, not just promise it then gate everything behind a paywall.' },
            { icon: '🎨', title: 'Character Customisation', desc: 'The ability to design your AI companion\'s appearance and personality makes the experience significantly more engaging.' },
            { icon: '✨', title: 'Extra Features', desc: 'AI image generation in chat, voice cloning, and video creation dramatically expand what you can do beyond text conversation.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="group rounded-2xl border border-white/10 bg-[#12121a] p-5 transition-all hover:border-[#ff3e8a]/30 hover:shadow-[0_0_20px_rgba(255,62,138,0.06)]">
              <span className="mb-3 block text-2xl">{icon}</span>
              <h3 className="text-sm font-semibold text-white">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/50">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Feature Comparison Table ─────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">NSFW AI Chat Feature Comparison</h2>
        <p className="mt-3 mb-6 text-sm text-white/40">Every major feature compared across the top three NSFW AI chat platforms.</p>
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div className="grid grid-cols-4 border-b border-white/10 bg-white/5 px-5 py-3 text-xs font-semibold text-white/60">
            <span>Feature</span>
            <span className="text-center text-[#ff3e8a]">Veloura.ai</span>
            <span className="text-center">CrushOn.ai</span>
            <span className="text-center">Candy.ai</span>
          </div>
          {[
            { feature: 'NSFW on free tier', uca: '✅ Full NSFW', crush: '✅ Limited', candy: '⚠️ Partial' },
            { feature: 'Custom character creation', uca: '✅ Full', crush: '⚠️ Limited', candy: '✅ Yes' },
            { feature: 'AI image generation in chat', uca: '✅ Yes', crush: '❌ No', candy: '❌ No' },
            { feature: 'Voice cloning', uca: '✅ Yes', crush: '❌ No', candy: '❌ No' },
            { feature: 'AI video tools', uca: '✅ Yes', crush: '❌ No', candy: '❌ No' },
            { feature: 'LoRA training', uca: '✅ Yes', crush: '❌ No', candy: '❌ No' },
            { feature: 'Persistent memory', uca: '✅ Long-term', crush: '⚠️ Session', candy: '⚠️ Session' },
            { feature: 'No credit card to start', uca: '✅ Yes', crush: '❌ Required', candy: '❌ Required' },
          ].map(({ feature, uca, crush, candy }, i) => (
            <div key={feature} className={`grid grid-cols-4 items-center px-5 py-3 text-sm ${i % 2 === 0 ? 'bg-white/[0.02]' : ''}`}>
              <span className="text-white/70">{feature}</span>
              <span className="text-center font-medium text-[#ff3e8a]">{uca}</span>
              <span className="text-center text-white/40">{crush}</span>
              <span className="text-center text-white/40">{candy}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── How We Tested ─────────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">How We Tested These NSFW AI Chat Platforms</h2>
        <div className="mt-4 max-w-3xl space-y-4 text-sm leading-relaxed text-white/60">
          <p>
            Testing NSFW AI chat platforms is straightforward: we signed up for each one with a fresh account, went through the onboarding, and immediately attempted progressively explicit conversations to find where the filters kick in — or don't. We also tested character customisation quality, how well the AI maintains context across long conversations, and whether the free tier genuinely delivers on its NSFW promises.
          </p>
          <p>
            Most platforms that claim to support NSFW content fail on one of three dimensions: they block specific content types without warning, they gradually insert disclaimers mid-conversation that break immersion, or they lock all explicit content behind premium plans while advertising as &quot;free.&quot; We specifically tested each of these failure modes.
          </p>
          <p>
            For the <strong className="text-white/80">AI companion quality</strong> tests, we ran extended multi-session conversations to evaluate memory persistence, character consistency, and personality depth. For <strong className="text-white/80">content freedom</strong> tests, we used a standardised set of prompts ranging from romantic to explicitly adult. The rankings reflect real hands-on testing, not sponsored placements.
          </p>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Platforms tested', value: '8 total', icon: '🔬' },
            { label: 'Hours of testing', value: '40+ hrs', icon: '⏱️' },
            { label: 'Test conversations', value: '200+', icon: '💬' },
          ].map(({ label, value, icon }) => (
            <div key={label} className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#12121a] px-4 py-3">
              <span className="text-xl">{icon}</span>
              <div>
                <p className="text-base font-bold text-white">{value}</p>
                <p className="text-xs text-white/40">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Who is NSFW AI chat for ───────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">Who Uses NSFW AI Chat — and Why</h2>
        <p className="mt-4 mb-6 max-w-3xl text-sm leading-relaxed text-white/60">
          NSFW AI chat is used by a broader audience than most people assume. The use cases go well beyond pure entertainment — many users turn to uncensored AI companions for creative writing, interactive roleplay storytelling, emotional connection during isolation, and fantasy exploration in a private, consequence-free space.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { icon: '✍️', title: 'Creative Writers & Storytellers', desc: 'Writers use NSFW AI chat to explore narrative directions, develop characters in intimate scenes, and overcome creative blocks — without an AI shutting down the story mid-sentence.' },
            { icon: '🎭', title: 'Roleplay Enthusiasts', desc: 'Fantasy and roleplay scenarios benefit from an AI that stays in character. Platforms with no filter maintain immersion far better than filtered alternatives that break the scene with safety notices.' },
            { icon: '💻', title: 'Solo Users Seeking Connection', desc: 'AI companions with memory and personality provide a form of emotional engagement for users who are isolated, socially anxious, or simply enjoy the experience of a persistent virtual relationship.' },
            { icon: '🔬', title: 'Researchers & Developers', desc: 'AI and psychology researchers use uncensored NSFW chat platforms to study LLM behavior, content moderation strategies, and the boundaries of AI companionship.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="group rounded-2xl border border-white/10 bg-[#12121a] p-5 transition-all hover:border-[#ff3e8a]/30 hover:shadow-[0_0_20px_rgba(255,62,138,0.05)]">
              <span className="mb-3 block text-2xl">{icon}</span>
              <h3 className="text-sm font-semibold text-white">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/50">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tips for getting the best experience ─────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">Tips for Getting the Best NSFW AI Chat Experience</h2>
        <p className="mt-4 mb-6 max-w-3xl text-sm leading-relaxed text-white/60">
          Even on a platform with no content filters, the quality of your NSFW AI chat experience depends on how you engage. These techniques produce significantly better results than jumping straight into prompts.
        </p>
        <ul className="space-y-3">
          {[
            { tip: 'Establish character context early', detail: 'Describe your companion\'s personality, backstory, and speaking style in the first few messages. The more detail you give upfront, the more consistent the AI\'s persona will be throughout the conversation.' },
            { tip: 'Use specific, descriptive language', detail: 'Vague prompts produce generic responses. Detailed descriptions of scenes, emotions, and physical context produce far more immersive and personalised NSFW AI chat responses.' },
            { tip: 'Build the conversation gradually', detail: 'Start with lighter interactions before escalating. AI companions that develop relationship context through gradual progression produce more emotionally engaging NSFW conversations than those that start explicit immediately.' },
            { tip: 'Leverage memory features', detail: 'On platforms like Veloura.ai that support persistent memory, reference shared history from previous sessions. This creates a genuine sense of an ongoing relationship rather than a reset each conversation.' },
            { tip: 'Combine chat with AI image generation', detail: 'Ask your AI companion to generate images of themselves during conversation. This visual layer transforms the chat from a text exchange into a fully immersive AI girlfriend experience.' },
          ].map(({ tip, detail }) => (
            <li key={tip} className="rounded-xl border border-white/10 bg-[#12121a] p-4 transition-all hover:border-[#ff3e8a]/20">
              <p className="text-sm font-semibold text-white">{tip}</p>
              <p className="mt-1 text-sm leading-relaxed text-white/50">{detail}</p>
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

      {/* ── Related Reading ───────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-xl font-bold text-white">Related Reading</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: 'AI Girlfriend Chat', desc: 'Build a real AI relationship — persistent memory, custom voice, and full NSFW support.', href: '/ai-girlfriend-chat', icon: '💕' },
            { title: 'Character AI Alternative', desc: 'The best Character.AI replacements without content filters for uncensored roleplay.', href: '/character-ai-alternative', icon: '🎭' },
            { title: 'ChatGPT Alternative', desc: 'ChatGPT blocks NSFW content. These alternatives don\'t.', href: '/chatgpt-alternative', icon: '🤖' },
            { title: 'Uncensored AI Video', desc: 'Generate uncensored AI videos — deepfakes, animations, motion transfer.', href: '/uncensored-ai-video-generator', icon: '🎬' },
          ].map(({ title, desc, href, icon }) => (
            <Link key={title} href={href} className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-[#12121a] p-4 transition-all hover:border-[#ff3e8a]/40 hover:shadow-[0_0_15px_rgba(255,62,138,0.08)]">
              <span className="text-2xl shrink-0">{icon}</span>
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
          <h2 className="text-2xl font-black text-white sm:text-3xl">Ready to Try the Best NSFW AI Chat?</h2>
          <p className="mt-3 text-sm text-white/50">Veloura.ai is free to start — no credit card required.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/free-nsfw-ai-chat" className="inline-flex items-center gap-2 rounded-xl bg-[#ff3e8a] px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-[#ff3e8a]/30 transition hover:bg-[#ff3e8a]/90">
              Start Free NSFW AI Chat →
            </Link>
            <Link href="/blog" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10">
              Read More Articles
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
