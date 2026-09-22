export const dynamic = 'force-static';
export const revalidate = 86400;

import Link from 'next/link';
import Footer from '@/components/Footer';
import FAQSchema from '@/components/seo/FAQSchema';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

const BREADCRUMB = [
  { name: 'Home', url: APP_URL },
  { name: 'AI Roleplay', url: `${APP_URL}/ai-roleplay` },
];

const FAQ_ITEMS = [
  { q: 'What is AI roleplay?', a: 'AI roleplay is an interactive storytelling experience where you and an AI character take on roles and act out scenarios together in real time. On Veloura.ai, AI roleplay is fully uncensored — covering romance, fantasy, adventure, NSFW, and any scenario you can imagine, with no content filters.' },
  { q: 'Is AI roleplay free?', a: 'Yes, AI roleplay is free on Veloura.ai. Free accounts can start roleplay sessions immediately. Premium plans unlock unlimited messages, longer context windows for extended storylines, and image generation within roleplay.' },
  { q: 'Is the AI roleplay uncensored?', a: 'Yes. Veloura.ai imposes no content restrictions on roleplay. Unlike Character.AI or other platforms that block NSFW content, you can explore any scenario — including explicit adult content — freely.' },
  { q: 'What types of AI roleplay scenarios are available?', a: 'Any scenario you can write. Popular categories include romance and relationship roleplay, fantasy and adventure, NSFW and adult scenarios, sci-fi and futuristic settings, historical and period roleplay, and slice-of-life conversational scenarios.' },
  { q: 'How is this different from Character.AI roleplay?', a: 'Character.AI blocks NSFW content and has heavy content filters. Veloura.ai has zero restrictions — your AI character can engage in any scenario you choose. We also combine roleplay with AI image generation so your AI companion can generate images within the story.' },
  { q: 'Can I create a custom AI character for roleplay?', a: 'Yes. Create a fully custom AI character with the personality, backstory, and appearance you design. Your character stays in role throughout the entire session and builds memory across multiple conversations.' },
];

const SCENARIO_TYPES = [
  { title: 'Romance & Relationship', desc: 'Build a romantic relationship with your AI companion. From first dates to deep emotional connection — no restrictions on how intimate it gets.' },
  { title: 'Fantasy & Adventure', desc: 'Explore magical worlds, mythical settings, and epic quests with AI characters as your companions, rivals, or love interests.' },
  { title: 'NSFW & Adult Scenarios', desc: 'Fully uncensored adult roleplay with no content filters. Explore any fantasy, fetish, or scenario freely and privately.' },
  { title: 'Sci-Fi & Futuristic', desc: 'Roleplay in space stations, cyberpunk cities, dystopian futures, or alien worlds with AI companions tailored to the setting.' },
  { title: 'Slice of Life', desc: 'Everyday conversational scenarios — a caring partner, a college romance, a workplace dynamic — realistic and emotionally rich.' },
  { title: 'Historical & Period', desc: 'Step into history — Victorian romance, ancient civilisations, or any historical setting brought to life with your AI character.' },
];

export default function AIRoleplayPage() {
  return (
    <div className="content-wrapper">
      <FAQSchema items={FAQ_ITEMS} />
      <BreadcrumbSchema items={BREADCRUMB} />

      {/* Hero */}
      <div className="mt-6 mb-14">
        <h1 className="page-title">AI Roleplay</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/60">
          Explore uncensored AI roleplay with no restrictions. Create custom AI characters,
          build any scenario, and let the story go wherever you want — romance, fantasy,
          adventure, or explicit NSFW content. No filters. Free to start.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/create-your-own-ai-character"
            className="inline-flex items-center gap-2 rounded-xl bg-[#ff3e8a] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#ff3e8a]/90"
          >
            Create a Roleplay Character
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Browse Characters
          </Link>
        </div>
      </div>

      {/* What is */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">What is Uncensored AI Roleplay?</h2>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/60">
          AI roleplay is a collaborative, real-time storytelling experience between you and an
          artificial intelligence character. You set the scene, the character responds in role,
          and the story unfolds dynamically based on your choices and dialogue. On
          Veloura.ai, AI roleplay has absolutely no content restrictions — your character
          can take the story anywhere, including explicit adult scenarios that other platforms
          block entirely.
        </p>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/60">
          Each AI character you create remembers the story across sessions, building a
          continuous narrative that grows with every conversation. Combined with AI image
          generation, your character can even generate visuals of scenes within the roleplay.
        </p>
      </div>

      {/* Scenario types */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">AI Roleplay Scenario Types</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SCENARIO_TYPES.map(({ title, desc }) => (
            <li key={title} className="rounded-2xl border border-white/10 bg-[#12121a] p-5">
              <h3 className="text-sm font-semibold text-white">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/50">{desc}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* How it works */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">How to Start AI Roleplay</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { step: '01', title: 'Choose or Create a Character', desc: 'Pick from hundreds of existing AI characters or create your own with a custom personality, backstory, and appearance.' },
            { step: '02', title: 'Set the Scene', desc: 'Describe the setting and scenario to your AI character. They will understand the context and step immediately into role.' },
            { step: '03', title: 'Let the Story Unfold', desc: 'Your AI character responds in character, reacts to your choices, and drives the story forward. No restrictions on where it goes.' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="rounded-2xl border border-white/10 bg-[#12121a] p-5">
              <span className="text-3xl font-black text-[#ff3e8a]/30">{step}</span>
              <h3 className="mt-2 text-base font-semibold text-white">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-white/50">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Why us over character ai */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">Why Choose Veloura.ai for AI Roleplay?</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            'Fully uncensored — no content filters, no blocked topics, no restrictions',
            'Create custom characters with full personality, backstory, and visual design',
            'Characters remember your story across multiple sessions',
            'Generate AI images of your character within the roleplay',
            'Better than Character.AI: no filter jailbreaks needed, everything works natively',
            'Combine roleplay with voice cloning for an immersive audio experience',
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
            { title: 'AI Girlfriend Chat', desc: 'Chat with your AI girlfriend — uncensored, no filters, with memory and voice included.', href: '/ai-girlfriend-chat' },
            { title: 'AI Boyfriend', desc: 'Create your perfect AI boyfriend — romantic, dominant, or playful. Chat free, no restrictions.', href: '/ai-boyfriend' },
            { title: 'Create AI Character', desc: 'Build a fully custom AI character with your chosen appearance, personality, and backstory.', href: '/create-your-own-ai-character' },
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
