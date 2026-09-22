import FAQSchema from '@/components/seo/FAQSchema';

const FAQ_ITEMS = [
  { q: 'Is AI voice cloning free?', a: 'Yes, voice cloning is free on Veloura.ai. Premium plans unlock longer samples, higher quality clones, and more generation credits.' },
  { q: 'How long does the voice sample need to be?', a: 'A minimum of 15–30 seconds of clear speech is recommended. Longer, cleaner samples produce more accurate clones.' },
  { q: 'How accurate is the voice clone?', a: 'Very accurate for tone, pitch, and accent. The AI captures the unique characteristics of the voice and reproduces them faithfully.' },
  { q: 'What audio formats are supported for upload?', a: 'MP3, WAV, and M4A are supported for voice sample upload.' },
  { q: 'Can I clone the voice of my AI companion?', a: 'Yes — you can record a custom voice, clone it, and use it as the voice for your AI girlfriend or companion on Veloura.ai.' },
];

export default function VoiceCloningSEOContent() {
  return (
    <section className="mt-20 pb-16">
      <FAQSchema items={FAQ_ITEMS} />
      <div className="mb-14 border-t border-white/10" />

      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">What is AI Voice Cloning?</h2>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/60">
          AI Voice Cloning captures the unique characteristics of any voice from a short audio
          sample and recreates it with stunning accuracy. Once cloned, the AI can generate speech
          in that voice from any text — preserving tone, accent, pitch, and speaking style as if
          the original person said it themselves.
        </p>
      </div>

      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">How Does AI Voice Cloning Work?</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { step: '01', title: 'Upload a Voice Sample', desc: 'Upload a short audio clip (15–30 seconds) of the voice you want to clone.' },
            { step: '02', title: 'Enter Your Text', desc: 'Type any text you want spoken in the cloned voice.' },
            { step: '03', title: 'Download the Audio', desc: 'The AI generates speech in the cloned voice. Download it instantly as MP3 or WAV.' },
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
        <h2 className="text-2xl font-bold text-white">What Can You Do with Voice Cloning?</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            'Clone your own voice for AI character companions',
            'Generate custom voice lines for AI girlfriends or partners',
            'Create personalised audio messages in any voice',
            'Produce voiceovers for video content',
            'Build unique AI voice personas for your projects',
            'Generate speech in a celebrity or character voice style',
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
