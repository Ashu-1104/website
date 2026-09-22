import FAQSchema from '@/components/seo/FAQSchema';

const FAQ_ITEMS = [
  { q: 'Is the AI eraser tool free?', a: 'Yes, the AI eraser is free to use on Veloura.ai. Premium plans unlock higher resolution processing.' },
  { q: 'How accurate is the fill after erasing?', a: 'The AI uses generative inpainting to reconstruct the erased area using surrounding pixels. Results are very clean on natural backgrounds.' },
  { q: 'Can it remove large objects?', a: 'Yes, though larger masked areas may take longer and results vary depending on the complexity of the surrounding background.' },
  { q: 'Does it work on AI-generated images?', a: 'Yes — it works on any image including photos, illustrations, and AI-generated artwork.' },
  { q: 'Is this different from the Inpainting tool?', a: 'The Eraser focuses on removing and auto-filling areas cleanly. Inpainting lets you replace areas with specific AI-generated content using a text prompt.' },
];

export default function AIEraserSEOContent() {
  return (
    <section className="mt-20 pb-16">
      <FAQSchema items={FAQ_ITEMS} />
      <div className="mb-14 border-t border-white/10" />

      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">What is the AI Object Eraser?</h2>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/60">
          The AI Object Eraser lets you remove unwanted people, objects, text, or watermarks from
          any photo in seconds. Simply brush over what you want removed and the AI intelligently
          fills in the area using surrounding context — leaving no trace behind.
        </p>
      </div>

      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">How Does the AI Eraser Work?</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { step: '01', title: 'Upload Your Photo', desc: 'Upload any image containing the object or area you want to remove.' },
            { step: '02', title: 'Brush Over the Area', desc: 'Paint a mask over the object, person, or area you want erased.' },
            { step: '03', title: 'AI Fills It In', desc: 'The AI removes the masked area and seamlessly fills it using the surrounding image.' },
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
        <h2 className="text-2xl font-bold text-white">What Can You Remove with AI Eraser?</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            'Remove people or strangers from background of photos',
            'Erase watermarks and logos from images',
            'Remove unwanted objects cluttering a scene',
            'Clean up AI-generated images with artifacts',
            'Remove text overlays from photos',
            'Erase blemishes or distracting elements from portraits',
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
