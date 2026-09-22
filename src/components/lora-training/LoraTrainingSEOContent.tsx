import FAQSchema from '@/components/seo/FAQSchema';

const FAQ_ITEMS = [
  { q: 'Is LoRA training free?', a: 'Yes, LoRA training is free on Veloura.ai. Premium plans unlock faster training, higher resolution models, and multiple concurrent training jobs.' },
  { q: 'How many images do I need to train a LoRA?', a: 'A minimum of 10–20 clear, consistent images of your character is recommended. More images (30–50) produce a more accurate and flexible model.' },
  { q: 'Can I train a NSFW AI character model?', a: 'Yes. Veloura.ai fully supports NSFW LoRA training. You can train an uncensored model of your AI girlfriend or any custom character without restrictions.' },
  { q: 'How long does LoRA training take?', a: 'Training typically takes 10–30 minutes depending on the number of images and your plan. Premium plans complete faster with priority processing.' },
  { q: 'What can I do with my trained LoRA model?', a: 'Once trained, your LoRA model can be used across the image generation tools on Veloura.ai to produce consistent, high-quality images of your AI girlfriend or custom character.' },
  { q: 'What image formats are accepted?', a: 'JPG and PNG images are supported. For best results, use high-resolution, well-lit photos with a consistent subject and minimal background clutter.' },
];

export default function LoraTrainingSEOContent() {
  return (
    <section className="mt-20 pb-16">
      <FAQSchema items={FAQ_ITEMS} />

      <div className="mb-14 border-t border-white/10" />

      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">What is LoRA Training for AI Characters?</h2>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/60">
          LoRA (Low-Rank Adaptation) training lets you fine-tune an AI image model on your own
          photos — teaching it to consistently generate a specific character, face, or style. On
          Veloura.ai, this means you can train a custom AI model of your virtual partner or
          AI girlfriend, then use it across the platform to generate high-quality, consistent
          images every time.
        </p>
      </div>

      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">How to Train Your Custom AI Girlfriend Model</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            {
              step: '01',
              title: 'Upload Character Images',
              desc: 'Upload 10–50 high-quality images of your AI character or virtual partner. More images produce a more accurate model.',
            },
            {
              step: '02',
              title: 'Start Training',
              desc: 'The AI fine-tunes a LoRA model on your images. Training typically completes in 10–30 minutes.',
            },
            {
              step: '03',
              title: 'Use Your Model',
              desc: 'Your trained LoRA model is ready to use across all image generation tools for consistent, high-quality results.',
            },
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
        <h2 className="text-2xl font-bold text-white">What Can You Create with a Custom LoRA Model?</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            'Generate consistent images of your AI girlfriend or virtual partner',
            'Create a unique uncensored AI character model with no restrictions',
            'Produce NSFW AI art featuring your custom character',
            'Build a recognisable AI persona for your virtual companion',
            'Use your model across face swap, filters, and image generation tools',
            'Share your trained model in the community model library',
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
