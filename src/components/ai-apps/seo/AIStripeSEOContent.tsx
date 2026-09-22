import FAQSchema from '@/components/seo/FAQSchema';

const FAQ_ITEMS = [
  { q: 'Is the stripe video generator free?', a: 'Yes, it is free on Veloura.ai. Premium plans unlock longer videos and higher resolution output.' },
  { q: 'What images work best for stripe effects?', a: 'High contrast images with a clear subject produce the most visually striking stripe animations.' },
  { q: 'How long is the output video?', a: 'Generated videos are typically 3–5 seconds — ideal for social media content and short reveals.' },
  { q: 'What format is the output?', a: 'Videos are exported as MP4, compatible with all major platforms including Instagram, TikTok, and Twitter.' },
  { q: 'Can I use AI-generated images with this tool?', a: 'Yes — any image works, including photos and AI-generated artwork.' },
];

export default function AIStripeSEOContent() {
  return (
    <section className="mt-20 pb-16">
      <FAQSchema items={FAQ_ITEMS} />
      <div className="mb-14 border-t border-white/10" />

      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">What is AI Stripe Video Generator?</h2>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/60">
          AI Stripe Video Generator creates stunning cinematic stripe-effect videos from any static
          image. The AI animates your photo with a sweeping stripe reveal effect — producing a
          smooth, eye-catching short video perfect for social media, intros, and creative
          presentations.
        </p>
      </div>

      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">How Does the Stripe Video Generator Work?</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { step: '01', title: 'Upload Your Image', desc: 'Upload any photo or AI-generated image you want to animate with the stripe effect.' },
            { step: '02', title: 'AI Generates the Animation', desc: 'The AI creates a smooth, cinematic stripe reveal animation from your image.' },
            { step: '03', title: 'Download Your Video', desc: 'Download your finished stripe video in MP4 format — ready to share anywhere.' },
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
        <h2 className="text-2xl font-bold text-white">What Can You Create with Stripe Video?</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            'Cinematic reveal animations for portraits',
            'Animated intros for social media content',
            'Eye-catching AI character reveal videos',
            'Creative video effects for digital art',
            'Animated thumbnails and preview clips',
            'Unique content for reels and short-form video',
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
