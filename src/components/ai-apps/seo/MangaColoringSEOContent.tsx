import FAQSchema from '@/components/seo/FAQSchema';

const FAQ_ITEMS = [
  { q: 'Is the manga colorizer free?', a: 'Yes, it is free to use on Veloura.ai. Premium plans unlock batch processing and higher resolution output.' },
  { q: 'Does it preserve the original line art?', a: 'Yes — the AI colours within the existing lines without altering the original drawing style or composition.' },
  { q: 'Can it handle full manga pages?', a: 'Yes. Single panels and full pages are both supported. Complex scenes with multiple characters and backgrounds are handled well.' },
  { q: 'Are NSFW manga pages supported?', a: 'Yes. Veloura.ai fully supports NSFW content including adult manga and doujinshi colorization.' },
  { q: 'What formats are supported?', a: 'JPG and PNG are supported for input. Results are exported as high-quality PNG to preserve detail.' },
];

export default function MangaColoringSEOContent() {
  return (
    <section className="mt-20 pb-16">
      <FAQSchema items={FAQ_ITEMS} />
      <div className="mb-14 border-t border-white/10" />

      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">What is the AI Manga Colorizer?</h2>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/60">
          The AI Manga Colorizer brings black and white manga pages to life with vibrant, accurate
          colours using generative AI. Upload any manga panel or page and the AI intelligently
          detects characters, backgrounds, and clothing — applying natural, consistent colours that
          feel true to the original art style.
        </p>
      </div>

      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">How Does the Manga Colorizer Work?</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { step: '01', title: 'Upload Your Manga Page', desc: 'Upload any black and white manga panel, page, or illustration.' },
            { step: '02', title: 'AI Analyses the Art', desc: 'The AI detects line art, characters, backgrounds, and scene context to apply appropriate colours.' },
            { step: '03', title: 'Download Coloured Art', desc: 'Download your fully coloured manga page in high resolution — ready to share or print.' },
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
        <h2 className="text-2xl font-bold text-white">What Can You Colorize?</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            'Black and white manga chapters and panels',
            'Anime-style line art and fan illustrations',
            'Classic manga scans from older series',
            'Original character sketches and drawings',
            'NSFW manga and doujinshi pages',
            'Webcomic panels and graphic novel pages',
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
