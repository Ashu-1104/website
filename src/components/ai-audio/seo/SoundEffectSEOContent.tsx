import FAQSchema from '@/components/seo/FAQSchema';

const FAQ_ITEMS = [
  { q: 'Is the sound effect generator free?', a: 'Yes, it is free on Veloura.ai. Premium plans unlock longer audio clips and higher quality output.' },
  { q: 'What makes a good sound effect prompt?', a: 'Be specific and descriptive. Include the type of sound, environment, intensity, and duration. Example: "heavy thunderstorm with distant thunder, 5 seconds".' },
  { q: 'What format are the sound effects?', a: 'Sound effects are exported as MP3 or WAV files.' },
  { q: 'Can I use generated sound effects commercially?', a: 'Premium plans include commercial usage rights. Check your plan details for specific licensing.' },
  { q: 'How long can the generated sound effects be?', a: 'Free accounts generate clips up to a few seconds. Premium plans unlock longer durations.' },
];

export default function SoundEffectSEOContent() {
  return (
    <section className="mt-20 pb-16">
      <FAQSchema items={FAQ_ITEMS} />
      <div className="mb-14 border-t border-white/10" />

      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">What is the AI Sound Effect Generator?</h2>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/60">
          The AI Sound Effect Generator creates custom audio sound effects from text descriptions
          in seconds. Describe any sound you need — rain, explosions, footsteps, ambient noise,
          UI sounds — and the AI generates a realistic, high-quality audio clip ready to use in
          your project.
        </p>
      </div>

      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">How Does the Sound Effect Generator Work?</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { step: '01', title: 'Describe Your Sound', desc: 'Type a text description of the sound effect you need. Be as specific as possible.' },
            { step: '02', title: 'AI Generates the Audio', desc: 'The AI creates a realistic audio clip matching your description in seconds.' },
            { step: '03', title: 'Download Your SFX', desc: 'Download your custom sound effect as a high-quality audio file instantly.' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="rounded-2xl border border-white/10 bg-[#12121a] p-5">
              <span className="text-3xl font-black text-[#ff3e8a]/30">{step}</span>
              <h3 className="mt-2 text-base font-semibold text-white">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-white/50">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">What Sound Effects Can You Generate?</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            'Ambient sound effects like rain, wind, and ocean',
            'Game sound effects including UI clicks and notifications',
            'Action sounds like explosions, impacts, and footsteps',
            'Nature sounds for relaxation or background audio',
            'Sci-fi and fantasy sound effects for creative projects',
            'Custom audio cues for apps and video content',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-[#12121a] px-4 py-3">
              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[#ff3e8a]" />
              <span className="text-sm text-white/60">{item}</span>
            </li>
          ))}
        </ul>
      </div>

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
