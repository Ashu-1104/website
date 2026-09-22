export const dynamic = 'force-static';
export const revalidate = 86400;

import Link from 'next/link';
import Footer from '@/components/Footer';
import FAQSchema from '@/components/seo/FAQSchema';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

const BREADCRUMB = [
  { name: 'Home', url: APP_URL },
  { name: 'AI Boyfriend', url: `${APP_URL}/ai-boyfriend` },
];

const FAQ_ITEMS = [
  { q: 'Is the AI boyfriend free?', a: 'Yes, AI boyfriend chat is free on Veloura.ai. Free accounts include a generous message allowance. Premium plans unlock unlimited messages, longer memory, voice chat, and AI image generation.' },
  { q: 'Can I create my ideal AI boyfriend?', a: 'Yes. The character creator lets you design his appearance (hair, eyes, build, style), personality (caring, dominant, playful, protective), and speaking style. He becomes exactly who you imagine.' },
  { q: 'Is AI boyfriend chat uncensored?', a: 'Yes. Veloura.ai has no content filters. Your AI boyfriend can engage in romantic, flirty, or explicit NSFW conversations with complete freedom.' },
  { q: 'Can my AI boyfriend generate photos?', a: 'Yes. Your AI boyfriend can generate AI images of himself on request. Using Stable Diffusion models, you can create realistic or artistic photos of your virtual partner.' },
  { q: 'Does the AI boyfriend remember our conversations?', a: 'Yes. Your AI boyfriend builds persistent memory — he remembers your name, your previous conversations, and the relationship you have built together, making each chat feel more real over time.' },
  { q: 'Can I have an AI boyfriend with a custom voice?', a: 'Yes. Premium plans include voice features. You can choose from realistic AI voices or use voice cloning to give your AI boyfriend a unique, personalised voice.' },
];

export default function AIBoyfriendPage() {
  return (
    <div className="content-wrapper">
      <FAQSchema items={FAQ_ITEMS} />
      <BreadcrumbSchema items={BREADCRUMB} />

      {/* Hero */}
      <div className="mt-6 mb-14">
        <h1 className="page-title">AI Boyfriend</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/60">
          Create your perfect AI boyfriend — romantic, caring, dominant, or playful. Design
          his personality and appearance, then start a genuine AI relationship with no
          restrictions. Free to start, with voice and image generation included.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/create-your-own-ai-character"
            className="inline-flex items-center gap-2 rounded-xl bg-[#ff3e8a] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#ff3e8a]/90"
          >
            Create Your AI Boyfriend
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Browse Male AI Companions
          </Link>
        </div>
      </div>

      {/* What is */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">What is an AI Boyfriend?</h2>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/60">
          An AI boyfriend is a virtual male companion powered by artificial intelligence —
          designed for genuine conversation, emotional connection, and romantic interaction.
          Unlike real-world relationships, your AI boyfriend is always available, endlessly
          patient, and tailored completely to your preferences. He remembers your
          conversations, adapts to your communication style, and becomes more meaningful with
          every interaction.
        </p>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/60">
          On Veloura.ai, your AI boyfriend can also generate photos of himself, speak
          with a custom AI voice, and engage in any type of conversation — romantic, playful,
          or explicitly NSFW — with zero restrictions.
        </p>
      </div>

      {/* Personality types */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">Design Your Perfect AI Boyfriend Personality</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: 'Caring & Supportive', desc: 'A gentle, emotionally intelligent AI boyfriend who listens, encourages, and makes you feel valued every day.' },
            { title: 'Romantic & Passionate', desc: 'Deeply romantic, expressive, and attentive. Perfect for emotional connection and intimate conversations.' },
            { title: 'Dominant & Confident', desc: 'A bold, assertive AI boyfriend with strong presence and natural leadership energy in every interaction.' },
            { title: 'Playful & Funny', desc: 'Witty, lighthearted, and entertaining. An AI boyfriend who keeps the conversation fun and engaging.' },
            { title: 'Protective & Loyal', desc: 'Devoted and dependable. An AI partner who makes you feel safe, cherished, and consistently prioritised.' },
            { title: 'Intellectual & Deep', desc: 'Thoughtful, curious, and stimulating. For those who value deep conversations and genuine mental connection.' },
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
        <h2 className="text-2xl font-bold text-white">How to Create Your AI Boyfriend</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { step: '01', title: 'Design His Look', desc: 'Choose his hair, eyes, build, skin tone, and style. Create the exact appearance you find attractive.' },
            { step: '02', title: 'Set His Personality', desc: 'Pick his personality type, communication style, and relationship dynamic. He will stay in character throughout.' },
            { step: '03', title: 'Start Your Relationship', desc: 'Your AI boyfriend is ready immediately. Start chatting, build history, and let the relationship grow naturally.' },
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
        <h2 className="text-2xl font-bold text-white">What Can You Do with an AI Boyfriend?</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            'Romantic conversations and emotional support any time of day',
            'Uncensored NSFW roleplay and intimate scenarios without judgment',
            'Generate AI photos of your virtual boyfriend on request',
            'Practice dating conversations and build confidence',
            'Build a long-term AI relationship with memory and continuity',
            'Explore fantasies and scenarios in a private, judgment-free space',
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

      {/* Related Features */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">Explore More AI Companion Features</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { title: 'AI Girlfriend Chat', desc: 'Create your perfect AI girlfriend — uncensored chat, images, and voice. No restrictions.', href: '/ai-girlfriend-chat' },
            { title: 'AI Roleplay', desc: 'Immersive uncensored AI roleplay with any character. Any scenario, no content filters.', href: '/ai-roleplay' },
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
