import FAQSchema from '@/components/seo/FAQSchema';

const FAQ_ITEMS = [
  { q: 'Is the AI song cover generator free?', a: 'Yes, it is free on Veloura.ai. Premium plans unlock longer songs and higher audio quality.' },
  { q: 'What audio formats can I upload?', a: 'MP3 and WAV are supported for input. Results are delivered as MP3.' },
  { q: 'How accurate is the AI voice cover?', a: 'The AI preserves the melody, rhythm, and emotion of the original while replacing the vocal. Quality varies with audio clarity.' },
  { q: 'Can I use a cloned voice for covers?', a: 'Yes — you can clone a voice in the Voice Cloning tool and use it to generate song covers in that voice.' },
  { q: 'Are there copyright considerations?', a: 'Generated covers are for personal and creative use. Always check copyright restrictions before distributing covers publicly.' },
];

export default function SongCoverSEOContent() {
  return (
    <section className="mt-20 pb-16">
      <FAQSchema items={FAQ_ITEMS} />
      <div className="mb-14 border-t border-white/10" />

      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">What is the AI Song Cover Generator?</h2>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/60">
          The AI Song Cover Generator creates AI voice covers of any song using a cloned or
          pre-trained voice. Upload an MP3 or provide a URL, choose a voice, and the AI
          re-sings the entire track in that voice — preserving melody, timing, and emotion while
          replacing the original vocalist.
        </p>
      </div>

      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">How Does the AI Song Cover Tool Work?</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { step: '01', title: 'Upload a Song or URL', desc: 'Upload an MP3 file or paste a URL of the song you want to create a cover of.' },
            { step: '02', title: 'Choose a Voice', desc: 'Select an AI voice from the library or use a cloned voice to re-sing the track.' },
            { step: '03', title: 'Download Your Cover', desc: 'The AI generates a full vocal cover in the selected voice. Download as MP3 instantly.' },
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
        <h2 className="text-2xl font-bold text-white">What Can You Create with AI Song Covers?</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            'Create AI covers of popular songs in any voice',
            'Hear your favourite song in a different vocal style',
            'Generate covers using your AI companion voice',
            'Produce unique remixes with AI voice swaps',
            'Create viral AI cover content for social media',
            'Experiment with different vocal interpretations of songs',
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
