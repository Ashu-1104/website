import FAQSchema from '@/components/seo/FAQSchema';

const FAQ_ITEMS = [
  { q: 'Is this tool free to use?', a: 'Yes, the NSFW Comic Book generator is free on Veloura.ai. Premium plans unlock higher resolution and batch generation.' },
  { q: 'What reference images work best?', a: 'Clear, well-lit photos with a visible subject work best. Portraits and full-body shots produce the most detailed comic art.' },
  { q: 'Is NSFW content allowed?', a: 'Yes. Veloura.ai is an adult platform. NSFW comic art generation is fully supported with no restrictions.' },
  { q: 'Can I use AI-generated images as input?', a: 'Absolutely — any image works as a reference, including AI-generated characters and artwork.' },
  { q: 'What comic styles are supported?', a: 'The AI supports western comic book, manga, and graphic novel styles depending on the reference image and prompt used.' },
];

export default function NSFWComicSEOContent() {
  return (
    <section className="mt-20 pb-16">
      <FAQSchema items={FAQ_ITEMS} />
      <div className="mb-14 border-t border-white/10" />

      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">What is the NSFW Comic Book Generator?</h2>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/60">
          The NSFW Comic Book Generator transforms any reference image into stunning comic-style
          artwork using AI. Upload a photo and our uncensored AI renders it in bold comic book
          aesthetics — complete with sharp lines, vibrant colours, and dramatic panel-style
          composition. No restrictions, full creative control.
        </p>
      </div>

      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">How Does the Comic Book Generator Work?</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { step: '01', title: 'Upload a Reference Image', desc: 'Upload any photo or AI-generated image you want converted into comic book style.' },
            { step: '02', title: 'AI Applies Comic Style', desc: 'The AI re-renders the image with bold outlines, vivid colours, and comic panel aesthetics.' },
            { step: '03', title: 'Download Your Artwork', desc: 'Download your comic-style artwork in full resolution — no watermark.' },
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
            'Turn portraits into NSFW comic book characters',
            'Generate adult comic-style AI art from photos',
            'Create original comic panels from AI characters',
            'Convert AI-generated images to comic book style',
            'Make superhero or villain versions of any photo',
            'Generate manga and western comic art styles',
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
