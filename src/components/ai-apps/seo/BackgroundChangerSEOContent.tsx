import FAQSchema from '@/components/seo/FAQSchema';

const FAQ_ITEMS = [
  { q: 'Is the AI background changer free?', a: 'Yes, it is free to use on Veloura.ai. No watermark. Premium plans unlock higher resolution and faster processing.' },
  { q: 'What kind of prompts work best?', a: 'Be descriptive — include lighting, environment, mood, and style. For example: "golden hour beach with waves, cinematic lighting, photorealistic".' },
  { q: 'Can it handle complex subjects like hair?', a: 'Yes. The AI handles intricate edges including hair, fur, and detailed outlines with high accuracy.' },
  { q: 'Can I use my own background image instead of a prompt?', a: 'Currently the tool generates backgrounds from text prompts. For uploading a custom background, try our Background Remover and composite manually.' },
  { q: 'What image formats are supported?', a: 'JPG, PNG, and WEBP are supported for input. Results are exported as high-quality JPG or PNG.' },
];

export default function BackgroundChangerSEOContent() {
  return (
    <section className="mt-20 pb-16">
      <FAQSchema items={FAQ_ITEMS} />
      <div className="mb-14 border-t border-white/10" />

      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">What is AI Background Changer?</h2>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/60">
          AI Background Changer lets you replace the background of any image with a completely new
          AI-generated scene — just describe what you want in a text prompt. Whether it's a sunset
          beach, a neon city, or a fantasy landscape, our AI generates and composites the new
          background seamlessly around your subject.
        </p>
      </div>

      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">How Does AI Background Changer Work?</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { step: '01', title: 'Upload Your Photo', desc: 'Upload any photo. The AI automatically isolates the subject from the existing background.' },
            { step: '02', title: 'Describe the New Background', desc: 'Type a text prompt describing the new scene — beach, studio, forest, space, anything.' },
            { step: '03', title: 'Download the Result', desc: 'The AI generates and blends the new background naturally. Download your result instantly.' },
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
        <h2 className="text-2xl font-bold text-white">What Can You Create with Background Changer?</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            'Place portraits in cinematic or fantasy settings',
            'Generate professional studio backgrounds for product photos',
            'Create AI character art with custom environments',
            'Replace boring backgrounds with dynamic AI scenes',
            'Build creative profile photos with unique backdrops',
            'Generate NSFW AI scenes with custom backgrounds',
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
