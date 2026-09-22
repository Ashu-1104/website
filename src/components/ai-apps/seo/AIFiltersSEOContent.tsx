import FAQSchema from '@/components/seo/FAQSchema';

const FAQ_ITEMS = [
  { q: 'Are AI filters free to use?', a: 'Yes, AI filters are free on Veloura.ai. Premium plans unlock additional filter styles and higher resolution output.' },
  { q: 'How are AI filters different from regular filters?', a: 'Regular filters apply colour adjustments. AI filters use generative models to completely re-render the image in a new style — far more powerful and artistic.' },
  { q: 'Can I use AI filters on NSFW images?', a: 'Yes. Veloura.ai supports adult content. NSFW images can be styled with any available filter.' },
  { q: 'Does the filter change the subject or just the style?', a: 'The subject and composition are preserved. Only the artistic style and visual treatment change.' },
  { q: 'What image formats are supported?', a: 'JPG, PNG, and WEBP are supported. Results are exported as high-quality JPG or PNG.' },
];

export default function AIFiltersSEOContent() {
  return (
    <section className="mt-20 pb-16">
      <FAQSchema items={FAQ_ITEMS} />
      <div className="mb-14 border-t border-white/10" />

      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">What are AI Photo Filters?</h2>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/60">
          AI Photo Filters go far beyond basic Instagram filters. Using generative AI, each filter
          completely re-renders your photo in a different artistic style — from oil painting and
          watercolour to cyberpunk, anime, and photorealistic transformations. The result is a
          fully transformed image, not just a colour overlay.
        </p>
      </div>

      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">How Do AI Filters Work?</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { step: '01', title: 'Upload Your Photo', desc: 'Upload any photo or AI-generated image you want to transform.' },
            { step: '02', title: 'Choose a Filter Style', desc: 'Pick from a range of AI-powered artistic styles and effects.' },
            { step: '03', title: 'Download the Result', desc: 'The AI re-renders your image in the chosen style. Download instantly — no watermark.' },
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
        <h2 className="text-2xl font-bold text-white">What Styles Can You Apply?</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            'Anime and manga art style transformations',
            'Oil painting and watercolour artistic effects',
            'Cyberpunk and neon-lit scene filters',
            'Photorealistic portrait enhancement filters',
            'Vintage film and retro photography styles',
            'Fantasy and dark art aesthetic filters',
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
