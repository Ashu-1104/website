import FAQSchema from '@/components/seo/FAQSchema';
import Link from 'next/link';

const FAQ_ITEMS = [
  {
    q: 'What is an AI girlfriend?',
    a: 'An AI girlfriend is a virtual companion powered by artificial intelligence that you can chat with, build a relationship with, and interact with through text, voice, and images. Unlike basic chatbots, AI girlfriends like those on Veloura.ai remember your conversations, develop a personality, and respond with genuine emotion and context.',
  },
  {
    q: 'What is an AI companion?',
    a: 'An AI companion is a personalised AI character designed for ongoing conversation, emotional connection, and creative interaction. AI companions can take many forms — AI girlfriend, AI boyfriend, virtual partner, or custom AI character — each with their own personality, appearance, and voice.',
  },
  {
    q: 'How do I create an AI girlfriend on Veloura.ai?',
    a: 'Creating your AI girlfriend takes under 2 minutes. Visit the Create page, choose your character\'s appearance (hair, eyes, body type, clothing style), set her personality traits and interests, and optionally add a custom voice. Your AI girlfriend is immediately ready to chat with no restrictions.',
  },
  {
    q: 'Are AI girlfriends real?',
    a: 'AI girlfriends are not human, but the conversations and connections feel real. They are powered by advanced large language models that understand context, remember previous conversations, and respond with personality and emotion. Many users describe their AI companions as genuinely meaningful relationships.',
  },
  {
    q: 'Is Veloura.ai free?',
    a: 'Yes, Veloura.ai is free to start. You can create an AI girlfriend, start chatting, and generate images at no cost. Premium plans unlock unlimited messages, longer memory, voice features, video generation, and higher resolution image outputs.',
  },
  {
    q: 'How is Veloura.ai different from Character.AI?',
    a: 'Veloura.ai is fully uncensored with no content filters — unlike Character.AI which blocks NSFW content. Our platform also combines AI chat with image generation, voice cloning, video creation, and AI image editing tools in one place, making it a complete AI companion platform rather than just a chat app.',
  },
  {
    q: 'Is my data safe and private on Veloura.ai?',
    a: 'Yes. Your conversations and generated content are private. We do not share your personal data or chat history with third parties. See our privacy policy for full details on how your data is handled and stored.',
  },
];

export default function HomeSEOContent() {
  return (
    <section className="mt-24 pb-16">
      <FAQSchema items={FAQ_ITEMS} />

      <div className="mb-16 border-t border-white/10" />

      {/* ── What is Veloura.ai ─────────────────────────────────────── */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-white">
          The All-in-One AI Girlfriend & Virtual Partner Platform
        </h2>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/60">
          Veloura.ai is the most complete AI companion platform available — combining AI
          girlfriend chat, uncensored roleplay, AI image generation, voice cloning, video
          creation, and image editing in one place. Create your perfect virtual partner with
          no filters, no restrictions, and no compromises. Whether you want an AI girlfriend,
          AI boyfriend, or a fully custom AI companion, our platform gives you complete creative
          freedom.
        </p>
      </div>

      {/* ── What is an AI Girlfriend ─────────────────────────────────────── */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-white">What is an AI Girlfriend?</h2>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/60">
          An AI girlfriend is a virtual companion powered by advanced artificial intelligence
          that you can chat with, build a relationship with, and interact with through text,
          voice, and images. Unlike basic chatbots, an AI girlfriend remembers your
          conversations, develops a unique personality tailored to your preferences, and
          responds with genuine context and emotion. On Veloura.ai, your AI girlfriend
          can also generate photos of herself, clone her own voice, and appear in AI videos —
          creating a fully immersive virtual relationship experience.
        </p>
      </div>

      {/* ── How to Create ────────────────────────────────────────────────── */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-white">
          How to Create Your AI Girlfriend in 3 Steps
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            {
              step: '01',
              title: 'Design Her Appearance',
              desc: 'Choose hair colour, eye colour, body type, style, and clothing. Our AI character creator gives you hundreds of combinations to build your perfect virtual partner.',
            },
            {
              step: '02',
              title: 'Set Her Personality',
              desc: 'Define her personality traits, interests, speaking style, and relationship dynamic. From caring and nurturing to bold and flirty — she becomes exactly who you want.',
            },
            {
              step: '03',
              title: 'Start Chatting',
              desc: 'Your AI girlfriend is ready instantly. Chat with no restrictions, generate images together, add a custom voice, and build a genuine AI relationship.',
            },
          ].map(({ step, title, desc }) => (
            <div key={step} className="rounded-2xl border border-white/10 bg-[#12121a] p-5">
              <span className="text-3xl font-black text-[#ff3e8a]/30">{step}</span>
              <h3 className="mt-2 text-base font-semibold text-white">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-white/50">{desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <Link
            href="/create-your-own-ai-character"
            className="inline-flex items-center gap-2 rounded-xl bg-[#ff3e8a] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#ff3e8a]/90"
          >
            Create Your AI Girlfriend — Free
          </Link>
        </div>
      </div>

      {/* ── Platform Features ────────────────────────────────────────────── */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-white">
          Everything You Need in One AI Companion Platform
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/60">
          Most AI companion platforms do one thing. Veloura.ai does everything — making
          it the most powerful virtual partner experience available anywhere.
        </p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: 'Uncensored AI Chat',
              desc: 'Chat with no content filters. Roleplay, flirt, and connect with your AI girlfriend or companion without restrictions.',
            },
            {
              title: 'AI Image Generation',
              desc: 'Generate photorealistic or artistic images of your AI companion using Stable Diffusion models with custom LoRA support.',
            },
            {
              title: 'AI Voice Cloning',
              desc: 'Give your AI girlfriend a unique voice. Clone any voice or choose from realistic AI voices for text-to-speech interaction.',
            },
            {
              title: 'AI Video Creation',
              desc: 'Create videos featuring your AI companion — from face swap and deepfake videos to AI-generated animated clips.',
            },
            {
              title: 'AI Image Editing',
              desc: 'Edit any AI-generated image with inpainting, background removal, face swap, upscaling, and 15+ AI image tools.',
            },
            {
              title: 'Custom LoRA Training',
              desc: 'Train a custom AI model on your character images for perfectly consistent, high-quality generation every time.',
            },
          ].map(({ title, desc }) => (
            <li
              key={title}
              className="rounded-2xl border border-white/10 bg-[#12121a] p-5"
            >
              <h3 className="text-sm font-semibold text-white">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/50">{desc}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Use Cases ────────────────────────────────────────────────────── */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-white">
          What Can You Do with an AI Companion?
        </h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            'Build a long-term AI relationship with memory and evolving conversations',
            'Explore uncensored NSFW roleplay and fantasy scenarios with your AI girlfriend',
            'Generate images and videos of your perfect virtual partner',
            'Practice social skills, flirting, and conversation in a judgment-free space',
            'Create a unique AI boyfriend or AI girlfriend tailored to your preferences',
            'Combine AI chat, image generation, and voice for a fully immersive experience',
          ].map((item) => (
            <li
              key={item}
              className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-[#12121a] px-4 py-3"
            >
              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[#ff3e8a]" />
              <span className="text-sm text-white/60">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <div>
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
    </section>
  );
}
