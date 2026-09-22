import FAQSchema from '@/components/seo/FAQSchema';

const FAQ_ITEMS = [
  { q: 'Is the AI song generator free?', a: 'Yes, it is free on Veloura.ai. Premium plans unlock longer songs, higher quality, and more generations.' },
  { q: 'What audio formats are supported?', a: 'MP3 and WAV are supported for input samples. Songs are exported as MP3.' },
  { q: 'Are the generated songs fully original?', a: 'Yes. The AI generates entirely new compositions — the output is not a copy or cover of an existing song.' },
  { q: 'What genres does the AI support?', a: 'The AI can generate across a wide range of genres including pop, R&B, hip-hop, rock, electronic, and more.' },
  { q: 'Can I use the AI-generated songs commercially?', a: 'Premium plans include commercial usage rights. Check your plan for specific licensing details.' },
];

export default function SongGenerationSEOContent() {
  return (
    <section className="mt-20 pb-16">
      <FAQSchema items={FAQ_ITEMS} />
      <div className="mb-14 border-t border-white/10" />

      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">What is the AI Song Generator?</h2>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/60">
          The AI Song Generator creates original full songs with real vocals from an input audio
          sample. Provide a reference track or melody, and the AI composes and sings an entirely
          new song in a matching style — complete with vocals, instrumentation, and production.
        </p>
      </div>

      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">How Does the AI Song Generator Work?</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { step: '01', title: 'Upload an Audio Sample', desc: 'Upload a reference audio file to guide the style, tempo, and mood of the generated song.' },
            { step: '02', title: 'AI Composes Your Song', desc: 'The AI generates an original song with vocals and instrumentation in the style of your reference.' },
            { step: '03', title: 'Download Your Song', desc: 'Download your AI-generated song as a full audio file ready to use or share.' },
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
        <h2 className="text-2xl font-bold text-white">What Can You Create?</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            'Generate original AI songs in any genre',
            'Create custom songs for your AI companion or character',
            'Produce unique vocal tracks for video content',
            'Generate theme songs or jingles for projects',
            'Create original music without any musical knowledge',
            'Experiment with new genres and vocal styles using AI',
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
