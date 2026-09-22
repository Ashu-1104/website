import FAQSchema from '@/components/seo/FAQSchema';

const FAQ_ITEMS = [
  { q: 'Is the AI face swap tool free?', a: 'Yes. You can use the face swap tool for free on Veloura.ai. No watermark on results. Premium plans unlock higher resolution output and priority processing.' },
  { q: 'How realistic are the face swap results?', a: 'Our face swap AI uses the latest deep learning models to match skin tone, lighting, and facial angles automatically. Results are highly realistic and blend naturally in most photos.' },
  { q: 'Does it work on videos too?', a: 'Yes — check out our Deepfake Video tool for AI-powered face swap on videos. The Face Swap tool here is optimised for photos.' },
  { q: 'Is my photo stored or shared?', a: 'Photos you upload are processed to generate your result and are not shared publicly. See our privacy policy for full details.' },
  { q: 'What photo formats are supported?', a: 'JPG, PNG, and WEBP formats are supported. For best results, use a clear, well-lit front-facing photo with a visible face.' },
];

/**
 * SEO content section for the Face Swap tool page.
 * Renders below the playground — visible to users and Google crawlers.
 * Targets keywords: face swap AI free, AI face swap online, best face swap tool.
 */
export default function FaceSwapSEOContent() {
  return (
    <section className="mt-20 pb-16">
      <FAQSchema items={FAQ_ITEMS} />

      {/* ── Divider ────────────────────────────────────────────────────────── */}
      <div className="mb-14 border-t border-white/10" />

      {/* ── What is it ─────────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">
          What is AI Face Swap?
        </h2>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/60">
          AI Face Swap is a free online tool that uses deep learning to seamlessly replace one
          face with another in any photo — in seconds. Whether you want to see yourself in a
          movie scene, swap faces with a friend, or create funny memes, our face swap AI
          delivers photorealistic results with zero technical skill required.
        </p>
      </div>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">
          How Does the Face Swap AI Work?
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            {
              step: '01',
              title: 'Upload Your Photo',
              desc: 'Upload the source photo containing the face you want to place.',
            },
            {
              step: '02',
              title: 'Upload the Target',
              desc: 'Upload the target photo — the image where you want the face swapped in.',
            },
            {
              step: '03',
              title: 'Download Your Result',
              desc: 'Our AI blends the faces naturally. Download your result instantly — no watermark.',
            },
          ].map(({ step, title, desc }) => (
            <div
              key={step}
              className="rounded-2xl border border-white/10 bg-[#12121a] p-5"
            >
              <span className="text-3xl font-black text-[#ff3e8a]/30">{step}</span>
              <h3 className="mt-2 text-base font-semibold text-white">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-white/50">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Use cases ──────────────────────────────────────────────────────── */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">
          What Can You Do with Face Swap AI?
        </h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            'Swap faces between friends for fun social media content',
            'Place yourself into movie scenes or iconic photos',
            'Create AI-generated portraits with different faces',
            'Generate NSFW AI images with face replacement',
            "Test how you'd look with a different hairstyle or look",
            'Create deepfake-style images for creative projects',
          ].map((item) => (
            <li
              key={item}
              className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-[#12121a] px-4 py-3"
            >
              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[#ff3e8a]" />
              <span className="text-sm text-white/60">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-2xl font-bold text-white">
          Frequently Asked Questions
        </h2>

        <div className="mt-6 space-y-3">
          {FAQ_ITEMS.map(({ q, a }) => (
            <details
              key={q}
              className="group rounded-2xl border border-white/10 bg-[#12121a]"
            >
              <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-semibold text-white select-none marker:hidden list-none">
                {q}
                <span className="ml-4 shrink-0 text-[#ff3e8a] transition-transform duration-200 group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="border-t border-white/10 px-5 py-4 text-sm leading-relaxed text-white/50">
                {a}
              </p>
            </details>
          ))}
        </div>
      </div>

    </section>
  );
}
