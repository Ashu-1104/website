import FAQSchema from '@/components/seo/FAQSchema';

const FAQ_ITEMS = [
  { q: 'Is AI cloth swap free?', a: 'Yes, it is free on Veloura.ai. Premium plans unlock higher resolution output and faster processing.' },
  { q: 'What photos work best?', a: 'Full-body or upper-body shots with clear visibility of the person produce the best results. Avoid heavily cropped or obscured photos.' },
  { q: 'Does it work on AI-generated characters?', a: 'Yes — it works on photos of real people and AI-generated characters alike.' },
  { q: 'Is NSFW cloth swap supported?', a: 'Yes. Veloura.ai is an adult platform and NSFW content generation including clothing swap is fully supported.' },
  { q: 'How realistic is the clothing transfer?', a: 'The AI preserves natural draping, lighting, and body contour. Results are highly realistic for standard clothing items.' },
];

export default function ClothSwapSEOContent() {
  return (
    <section className="mt-20 pb-16">
      <FAQSchema items={FAQ_ITEMS} />
      <div className="mb-14 border-t border-white/10" />

      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">What is AI Cloth Swap?</h2>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/60">
          AI Cloth Swap lets you virtually swap outfits on any person using AI. Upload a photo of
          a person and a clothing reference image, and our AI accurately transfers the clothing
          onto the subject — preserving body shape, lighting, and natural draping for a realistic
          result.
        </p>
      </div>

      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">How Does AI Cloth Swap Work?</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { step: '01', title: 'Upload Person Photo', desc: 'Upload a clear photo of the person whose outfit you want to change.' },
            { step: '02', title: 'Upload Clothing Reference', desc: 'Upload a photo of the clothing or outfit you want to apply to the person.' },
            { step: '03', title: 'Download the Result', desc: 'The AI transfers the outfit naturally onto the subject. Download your result instantly.' },
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
        <h2 className="text-2xl font-bold text-white">What Can You Do with AI Cloth Swap?</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            'Virtually try on outfits without changing clothes',
            'Dress AI characters in custom outfits',
            'Preview clothing on different body types',
            'Create fashion content and lookbooks with AI',
            'Swap outfits on AI-generated characters',
            'Generate NSFW clothing swap content from photos',
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
