import FAQSchema from '@/components/seo/FAQSchema';

const FAQ_ITEMS = [
  { q: 'Is AI text to speech free?', a: 'Yes, the text to speech tool is free on Veloura.ai. Premium plans unlock more voices, longer text inputs, and higher quality audio.' },
  { q: 'How realistic are the AI voices?', a: 'Very realistic. Our AI uses the latest neural voice models that capture natural rhythm, emotion, and subtle human-like qualities.' },
  { q: 'What languages are supported?', a: 'Multiple languages and accents are supported including English, Spanish, French, German, Japanese, and more.' },
  { q: 'What audio formats are available?', a: 'Audio is available in MP3 and WAV format depending on your plan.' },
  { q: 'Can I use it for commercial projects?', a: 'Check the terms of your plan. Premium plans include commercial usage rights for generated audio.' },
];

export default function TextToSpeechSEOContent() {
  return (
    <section className="mt-20 pb-16">
      <FAQSchema items={FAQ_ITEMS} />
      <div className="mb-14 border-t border-white/10" />

      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">What is AI Text to Speech?</h2>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/60">
          AI Text to Speech converts any written text into natural, realistic spoken audio using
          advanced neural voice models. Unlike robotic TTS of the past, our AI generates speech
          with natural rhythm, emotion, and intonation — indistinguishable from a real human voice
          in most cases.
        </p>
      </div>

      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">How Does AI Text to Speech Work?</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { step: '01', title: 'Enter Your Text', desc: 'Type or paste any text you want converted to speech — up to thousands of characters.' },
            { step: '02', title: 'Choose a Voice', desc: 'Select from a range of realistic AI voices across different accents, ages, and styles.' },
            { step: '03', title: 'Download the Audio', desc: 'The AI generates your speech audio in seconds. Download as MP3 or WAV instantly.' },
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
        <h2 className="text-2xl font-bold text-white">What Can You Use AI Text to Speech For?</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            'Generate voice lines for AI characters and companions',
            'Create voiceovers for videos and reels',
            'Produce audiobook narration with AI voices',
            'Add speech to animations and presentations',
            'Generate realistic AI girlfriend or boyfriend voice',
            'Create content in multiple languages and accents',
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
