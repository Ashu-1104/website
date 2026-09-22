import FAQSchema from '@/components/seo/FAQSchema';

const FAQ_ITEMS = [
  { q: 'Is the AI avatar generator free?', a: 'Yes, it is free on Veloura.ai. Premium plans unlock higher resolution and more generation credits.' },
  { q: 'What prompt styles work best?', a: 'Be specific — describe the art style, lighting, background, and mood. For example: "anime style, glowing eyes, dark background, detailed".' },
  { q: 'Can I generate avatars of real people?', a: 'Yes, upload any photo as a reference. The AI will style it according to your prompt while preserving the subject likeness.' },
  { q: 'Are NSFW avatars supported?', a: 'Yes. Veloura.ai is an adult platform and NSFW avatar generation is fully supported.' },
  { q: 'What resolution are the avatars?', a: 'Standard output is 512×512. Premium plans generate at 1024×1024 and above for sharper, print-ready results.' },
];

export default function AIAvatarSEOContent() {
  return (
    <section className="mt-20 pb-16">
      <FAQSchema items={FAQ_ITEMS} />
      <div className="mb-14 border-t border-white/10" />

      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">What is the AI Avatar Generator?</h2>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/60">
          The AI Avatar Generator creates stunning custom profile pictures and headshots from your
          photos using generative AI. Upload a photo, describe your desired style, and the AI
          produces a unique, high-quality avatar in seconds — perfect for social media, gaming
          profiles, or professional use.
        </p>
      </div>

      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">How Does the AI Avatar Generator Work?</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { step: '01', title: 'Upload Your Photo', desc: 'Upload a clear photo of yourself or any subject you want turned into an avatar.' },
            { step: '02', title: 'Describe Your Style', desc: 'Use a text prompt to describe the avatar style — anime, realistic, cyberpunk, fantasy, and more.' },
            { step: '03', title: 'Download Your Avatar', desc: 'The AI generates your custom avatar in high resolution. Download it instantly — no watermark.' },
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
        <h2 className="text-2xl font-bold text-white">What Can You Create with AI Avatar Generator?</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            'Custom profile pictures for social media and Discord',
            'Professional AI headshots in any style',
            'Gaming avatars and character portraits',
            'Anime-style versions of yourself or others',
            'Fantasy and sci-fi character avatars',
            'NSFW AI character profile pictures',
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
