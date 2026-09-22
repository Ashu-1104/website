import FAQSchema from '@/components/seo/FAQSchema';

const FAQ_ITEMS = [
  { q: 'Is the AI kissing video creator free?', a: 'Yes, it is free on Veloura.ai. Premium plans unlock longer videos and higher resolution output.' },
  { q: 'What photo types work best?', a: 'Clear, front-facing photos with good lighting produce the most realistic video results. Avoid heavily obscured or side-profile photos.' },
  { q: 'How long is the generated video?', a: 'Generated videos are typically 3–6 seconds. Premium plans may unlock longer durations.' },
  { q: 'Is NSFW video content supported?', a: 'Yes. Veloura.ai is an adult platform and NSFW video generation is fully supported.' },
  { q: 'What format is the output video?', a: 'Videos are delivered in MP4 format, compatible with all major platforms and devices.' },
];

export default function AIKissingVideoSEOContent() {
  return (
    <section className="mt-20 pb-16">
      <FAQSchema items={FAQ_ITEMS} />
      <div className="mb-14 border-t border-white/10" />

      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">What is the AI Kissing Video Creator?</h2>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/60">
          The AI Kissing Video Creator generates romantic kissing videos from just two photos using
          advanced AI video synthesis. Upload two face photos and our AI creates a short, realistic
          video of the two subjects in an intimate scene — no filming, no editing required.
        </p>
      </div>

      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">How Does the AI Kissing Video Creator Work?</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { step: '01', title: 'Upload First Photo', desc: 'Upload a clear photo of the first person.' },
            { step: '02', title: 'Upload Second Photo', desc: 'Upload a clear photo of the second person. The AI handles the rest.' },
            { step: '03', title: 'Download Your Video', desc: 'The AI generates a smooth, realistic kissing video. Download it in seconds.' },
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
            'Romantic AI videos from couple photos',
            'Generate intimate scenes with AI characters',
            'Create unique AI-powered video gifts',
            'Produce NSFW AI video content from photos',
            'Generate AI couple videos for creative projects',
            'Combine real and AI-generated characters in video',
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
