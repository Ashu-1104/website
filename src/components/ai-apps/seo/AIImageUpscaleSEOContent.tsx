import FAQSchema from '@/components/seo/FAQSchema';

const FAQ_ITEMS = [
  { q: 'Is the AI image upscaler free?', a: 'Yes, you can upscale images for free on Veloura.ai. Premium plans unlock 4x upscaling and batch processing.' },
  { q: 'What is the maximum upscale factor?', a: 'Up to 4x the original resolution is supported. A 512×512 image becomes 2048×2048 at 4x.' },
  { q: 'Does upscaling add detail that was not there?', a: 'Yes — the AI uses super-resolution models trained on millions of images to intelligently reconstruct fine detail like hair, texture, and edges.' },
  { q: 'What image formats are supported?', a: 'JPG, PNG, and WEBP are supported for input. Results are exported as high-quality PNG.' },
  { q: 'Does it work on AI-generated images?', a: 'Yes, it is especially effective on AI-generated images which often benefit from extra sharpening and detail recovery.' },
];

export default function AIImageUpscaleSEOContent() {
  return (
    <section className="mt-20 pb-16">
      <FAQSchema items={FAQ_ITEMS} />
      <div className="mb-14 border-t border-white/10" />

      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">What is AI Image Upscaler?</h2>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/60">
          AI Image Upscaler enhances and enlarges any image up to 4x its original size without
          losing quality. Using advanced super-resolution AI, it recovers fine details, sharpens
          edges, and removes compression artifacts — turning blurry or low-resolution images into
          crisp, high-definition results.
        </p>
      </div>

      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">How Does the AI Upscaler Work?</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { step: '01', title: 'Upload Your Image', desc: 'Upload any low-resolution or blurry image you want to enhance.' },
            { step: '02', title: 'Choose Upscale Factor', desc: 'Select 2x or 4x upscaling depending on how much you want to enlarge the image.' },
            { step: '03', title: 'Download HD Result', desc: 'The AI enhances every pixel and delivers a sharp, high-resolution version instantly.' },
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
        <h2 className="text-2xl font-bold text-white">When Should You Use AI Upscaling?</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            'Upscale AI-generated images for printing or display',
            'Enhance old or low-quality photos to HD',
            'Enlarge product images without pixelation',
            'Recover detail from compressed or blurry images',
            'Prepare images for large-format use or wallpapers',
            'Sharpen portraits and face details with AI',
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
