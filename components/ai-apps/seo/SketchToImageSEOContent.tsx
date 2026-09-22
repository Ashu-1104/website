import FAQSchema from '@/components/seo/FAQSchema';

const FAQ_ITEMS = [
  { q: 'Is sketch to image free?', a: 'Yes, it is free on Veloura.ai. Premium plans unlock higher resolution and more generation credits.' },
  { q: 'Does my sketch need to be detailed?', a: 'No. The AI works with rough sketches and detailed line art alike. More detail in the sketch gives the AI more to work with, but simple doodles work too.' },
  { q: 'What prompt tips help most?', a: 'Describe the style, lighting, and subject clearly. Example: "photorealistic portrait, studio lighting, detailed, sharp focus".' },
  { q: 'Are NSFW sketches supported?', a: 'Yes. Veloura.ai fully supports adult content generation from sketch inputs.' },
  { q: 'What sketch formats are supported?', a: 'JPG, PNG, and WEBP are supported. Black and white sketches on a white background tend to produce the best results.' },
];

export default function SketchToImageSEOContent() {
  return (
    <section className="mt-20 pb-16">
      <FAQSchema items={FAQ_ITEMS} />
      <div className="mb-14 border-t border-white/10" />

      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">What is Sketch to Image AI?</h2>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/60">
          Sketch to Image AI transforms hand-drawn sketches, line art, and rough drawings into
          fully detailed, realistic or stylised images using generative AI. Whether your drawing
          is a rough scribble or a detailed illustration, our AI interprets the structure and
          renders a polished, photorealistic result in seconds.
        </p>
      </div>

      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">How Does Sketch to Image Work?</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { step: '01', title: 'Upload Your Sketch', desc: 'Upload any hand-drawn sketch, line art, or rough drawing in JPG or PNG format.' },
            { step: '02', title: 'Describe the Result', desc: 'Add a text prompt to guide the AI — describe style, colours, mood, and details.' },
            { step: '03', title: 'Download the Image', desc: 'The AI renders your sketch into a detailed, realistic or stylised image. Download instantly.' },
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
        <h2 className="text-2xl font-bold text-white">What Can You Convert with Sketch to Image?</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            'Turn rough character sketches into detailed portraits',
            'Convert line art into photorealistic images',
            'Bring concept art and storyboards to life',
            'Transform doodles into professional AI artwork',
            'Create AI characters from original hand-drawn designs',
            'Generate NSFW artwork from sketch references',
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
