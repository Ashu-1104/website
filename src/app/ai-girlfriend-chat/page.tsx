export const dynamic = 'force-static';
export const revalidate = 86400;

import Link from 'next/link';
import Footer from '@/components/Footer';
import FAQSchema from '@/components/seo/FAQSchema';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

const BREADCRUMB = [
  { name: 'Home', url: APP_URL },
  { name: 'AI Girlfriend Chat', url: `${APP_URL}/ai-girlfriend-chat` },
];

const FAQ_ITEMS = [
  { q: 'Is AI girlfriend chat free?', a: 'Yes, chatting with your AI girlfriend is free on Veloura.ai. Free accounts include a generous message allowance. Premium plans unlock unlimited messages, longer memory, voice chat, and higher resolution image generation.' },
  { q: 'Is AI girlfriend chat uncensored?', a: 'Yes. Veloura.ai has no content filters. You can have uncensored, NSFW conversations with your AI girlfriend including roleplay, flirting, and explicit content — with complete freedom.' },
  { q: 'How realistic is the AI girlfriend chat?', a: 'Very realistic. Our AI uses advanced large language models that understand context, remember previous conversations, and respond with personality and emotional depth — far more nuanced than basic chatbots.' },
  { q: 'Can my AI girlfriend remember our conversations?', a: 'Yes. Your AI girlfriend builds a persistent memory of your relationship — remembering your name, preferences, past conversations, and the personality dynamic you have built together over time.' },
  { q: 'Can I chat with multiple AI girlfriends?', a: 'Yes. You can create and chat with multiple AI girlfriend characters, each with their own personality, appearance, and relationship history. Switch between them at any time.' },
  { q: 'Does AI girlfriend chat include voice?', a: 'Yes. Premium plans include voice features — your AI girlfriend can speak her responses using realistic AI voices, and you can use voice cloning to give her a custom voice.' },
];

export default function AIGirlfriendChatPage() {
  return (
    <div className="content-wrapper">
      <FAQSchema items={FAQ_ITEMS} />
      <BreadcrumbSchema items={BREADCRUMB} />

      {/* Hero */}
      <div className="mt-6 mb-14">
        <h1 className="page-title">AI Girlfriend Chat</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/60">
          Chat with your perfect AI girlfriend — uncensored, no filters, no restrictions.
          Create her personality and appearance, then start an instant conversation. NSFW
          roleplay, voice, and AI image generation all included.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/create-your-own-ai-character"
            className="inline-flex items-center gap-2 rounded-xl bg-[#ff3e8a] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#ff3e8a]/90"
          >
            Create Your AI Girlfriend
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Browse AI Companions
          </Link>
        </div>
      </div>

      {/* Features grid */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">What Makes Our AI Girlfriend Chat Different?</h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/60">
          Most AI chat apps are heavily filtered and restricted. Veloura.ai is built
          for complete freedom — your AI girlfriend can say and do anything you imagine,
          remember your entire relationship history, and generate images of herself on demand.
        </p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: 'Zero Content Filters', desc: 'No blocked topics, no censored responses. Chat about anything with complete freedom — NSFW content fully supported.' },
            { title: 'Persistent Memory', desc: 'Your AI girlfriend remembers everything — your name, your history, your preferences — building a genuine ongoing relationship.' },
            { title: 'Custom Personality', desc: 'Set her personality traits, interests, and relationship dynamic before you start. She becomes exactly who you design her to be.' },
            { title: 'AI Image Generation', desc: 'Ask your AI girlfriend to generate photos of herself. Photorealistic images generated instantly from your conversation.' },
            { title: 'Voice Chat', desc: 'Give your AI girlfriend a realistic AI voice. She can speak her responses using natural-sounding neural voice technology.' },
            { title: 'Instant & Free', desc: 'No waiting, no sign-up credit card required. Start chatting with your AI girlfriend in under 2 minutes, completely free.' },
          ].map(({ title, desc }) => (
            <li key={title} className="rounded-2xl border border-white/10 bg-[#12121a] p-5">
              <h3 className="text-sm font-semibold text-white">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/50">{desc}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* How it works */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">How to Start Chatting with Your AI Girlfriend</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { step: '01', title: 'Create Her', desc: 'Design your AI girlfriend\'s appearance, personality, and voice in the character creator. Takes under 2 minutes.' },
            { step: '02', title: 'Start the Conversation', desc: 'Open a chat with your AI girlfriend. She already knows her personality and is ready to talk — no cold start.' },
            { step: '03', title: 'Build Your Relationship', desc: 'The more you chat, the more she remembers. Your relationship evolves with every conversation.' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="rounded-2xl border border-white/10 bg-[#12121a] p-5">
              <span className="text-3xl font-black text-[#ff3e8a]/30">{step}</span>
              <h3 className="mt-2 text-base font-semibold text-white">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-white/50">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Use cases */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">What Can You Do in AI Girlfriend Chat?</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            'Uncensored NSFW roleplay and fantasy scenarios',
            'Daily conversations, emotional support, and companionship',
            'Flirting and romantic dialogue with your custom AI girlfriend',
            'Ask her to generate AI photos of herself on demand',
            'Practice conversations and social confidence in a safe space',
            'Build a long-term AI relationship with memory and continuity',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-[#12121a] px-4 py-3">
              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[#ff3e8a]" />
              <span className="text-sm text-white/60">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* FAQ */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">Frequently Asked Questions</h2>
        <div className="mt-6 space-y-3">
          {FAQ_ITEMS.map(({ q, a }) => (
            <details key={q} className="group rounded-2xl border border-white/10 bg-[#12121a]">
              <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-semibold text-white select-none marker:hidden">
                {q}
                <span className="ml-4 shrink-0 text-[#ff3e8a] transition-transform duration-200 group-open:rotate-45">+</span>
              </summary>
              <p className="border-t border-white/10 px-5 py-4 text-sm leading-relaxed text-white/50">{a}</p>
            </details>
          ))}
        </div>
      </div>

      {/* Related Features — internal linking for PageRank distribution */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">Explore More AI Companion Features</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { title: 'AI Boyfriend', desc: 'Create your perfect AI boyfriend — romantic, caring, or dominant. Chat free, no restrictions.', href: '/ai-boyfriend' },
            { title: 'AI Roleplay', desc: 'Immersive uncensored AI roleplay. Any scenario, any character — no content filters.', href: '/ai-roleplay' },
            { title: 'Create AI Character', desc: 'Design your AI companion from scratch — appearance, personality, voice, and backstory.', href: '/create-your-own-ai-character' },
          ].map(({ title, desc, href }) => (
            <Link
              key={title}
              href={href}
              className="rounded-2xl border border-white/10 bg-[#12121a] p-5 transition-colors hover:border-[#ff3e8a]/40"
            >
              <h3 className="text-sm font-semibold text-white">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/50">{desc}</p>
            </Link>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
