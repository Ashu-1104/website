import FAQSchema from '@/components/seo/FAQSchema';

const FAQ_ITEMS = [
  { q: 'Is the background remover free?', a: 'Yes. The AI background remover is free to use on Veloura.ai. No watermark on results. Premium plans unlock batch processing and higher resolution output.' },
  { q: 'What image formats are supported?', a: 'JPG, PNG, and WEBP are supported. The result is always exported as a transparent PNG.' },
  { q: 'Does it work on complex backgrounds?', a: 'Yes. The AI handles complex scenes including hair, fur, and detailed edges with high accuracy.' },
  { q: 'Can I use it on AI-generated images?', a: 'Absolutely. It works on any image — photos, illustrations, and AI-generated art alike.' },
  { q: 'How is this different from manual selection in Photoshop?', a: 'Our AI processes the image in under a second automatically — no manual selection or layer masking required.' },
];

export default function BackgroundRemoverSEOContent() {
  return (
    <section className="mt-20 pb-16">
      <FAQSchema items={FAQ_ITEMS} />
      <div className="mb-14 border-t border-white/10" />

      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">What is AI Background Remover?</h2>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/60">
          AI Background Remover is a free online tool that automatically detects and removes the
          background from any image in one click — no manual masking or Photoshop skills needed.
          Powered by advanced deep learning, it cleanly separates the subject from the background
          with pixel-perfect precision.
        </p>
      </div>

      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">How Does the Background Remover Work?</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { step: '01', title: 'Upload Your Image', desc: 'Upload any JPG, PNG, or WEBP photo containing the subject you want to isolate.' },
            { step: '02', title: 'AI Detects the Subject', desc: 'Our AI instantly identifies the foreground subject and removes the background cleanly.' },
            { step: '03', title: 'Download Transparent PNG', desc: 'Download your image with a transparent background — ready for any project.' },
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
        <h2 className="text-2xl font-bold text-white">What Can You Use Background Removal For?</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            'Remove backgrounds from product photos for e-commerce',
            'Create profile pictures with transparent backgrounds',
            'Isolate AI-generated characters for editing',
            'Prepare images for custom wallpapers or composites',
            'Remove distracting backgrounds from portraits',
            'Create sticker-style cutouts from any photo',
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
