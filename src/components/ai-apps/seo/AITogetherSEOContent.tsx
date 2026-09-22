import FAQSchema from '@/components/seo/FAQSchema';

const FAQ_ITEMS = [
  { q: 'Is AI Together free to use?', a: 'Yes, it is free on Veloura.ai. Premium plans unlock higher resolution output and priority processing.' },
  { q: 'What photos work best?', a: 'Clear, well-lit photos with a visible subject against a simple background produce the most natural results.' },
  { q: 'Does NSFW content work with this tool?', a: 'Yes. Veloura.ai fully supports adult content generation including NSFW combined images.' },
  { q: 'Can I combine more than two people?', a: 'Currently the tool supports combining two subjects per image. For complex scenes, multiple passes can be used.' },
  { q: 'How realistic are the results?', a: 'The AI matches lighting, skin tone, and scale between subjects for highly realistic compositions in most scenarios.' },
];

export default function AITogetherSEOContent() {
  return (
    <section className="mt-20 pb-16">
      <FAQSchema items={FAQ_ITEMS} />
      <div className="mb-14 border-t border-white/10" />

      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">What is AI Together?</h2>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/60">
          AI Together is a unique tool that combines two separate photos of people into one
          seamless, realistic scene. Whether you want to place yourself next to a friend, a
          celebrity, or an AI character — our AI merges both subjects naturally into a single
          believable image with matching lighting, perspective, and background.
        </p>
      </div>

      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">How Does AI Together Work?</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { step: '01', title: 'Upload First Photo', desc: 'Upload the first person or subject you want to appear in the combined image.' },
            { step: '02', title: 'Upload Second Photo', desc: 'Upload the second person or subject. The AI will merge both into one scene.' },
            { step: '03', title: 'Download the Result', desc: 'The AI composites both subjects into a natural, seamless image. Download instantly.' },
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
        <h2 className="text-2xl font-bold text-white">What Can You Create with AI Together?</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            'Combine yourself with an AI girlfriend or character',
            'Create couple photos with any two people',
            'Place yourself next to celebrities or fictional characters',
            'Generate NSFW couple scenes from two photos',
            'Create fun social media content with friends',
            'Merge real people with AI-generated characters',
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
