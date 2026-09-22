import FAQSchema from '@/components/seo/FAQSchema';

const FAQ_ITEMS = [
  { q: 'Is the deepfake video maker free?', a: 'Yes, the basic deepfake tool is free on Veloura.ai. Premium plans unlock longer videos and faster processing speeds.' },
  { q: 'What video formats are supported?', a: 'MP4 is the recommended format. The output is delivered as an MP4 file.' },
  { q: 'How long does processing take?', a: 'Processing time depends on video length. Short clips (under 30 seconds) typically complete within a few minutes.' },
  { q: 'Does it work on any face in a video?', a: 'For best results, the source face should be a clear, front-facing photo with good lighting. The AI performs best on videos with a single dominant face.' },
  { q: 'Is there a video length limit?', a: 'Free accounts have a video length limit. Upgrade to a premium plan to process longer clips.' },
];

export default function DeepfakeSEOContent() {
  return (
    <section className="mt-20 pb-16">
      <FAQSchema items={FAQ_ITEMS} />
      <div className="mb-14 border-t border-white/10" />

      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">What is AI Deepfake Video Maker?</h2>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/60">
          AI Deepfake Video Maker uses advanced neural networks to swap faces in videos with
          photorealistic accuracy. Upload a source face and a target video, and our AI seamlessly
          replaces the face throughout the entire clip — matching lighting, angle, and expression
          frame by frame.
        </p>
      </div>

      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">How Does the Deepfake Video Tool Work?</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { step: '01', title: 'Upload the Face', desc: 'Upload a clear photo of the face you want to insert into the video.' },
            { step: '02', title: 'Upload the Target Video', desc: 'Upload the video where you want the face replaced. Works with most common video formats.' },
            { step: '03', title: 'Download Your Video', desc: 'The AI processes each frame and outputs a seamless deepfake video ready to download.' },
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
        <h2 className="text-2xl font-bold text-white">What Can You Create with Deepfake AI?</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            'Place yourself or a friend into movie clips',
            'Create funny parody videos with face swaps',
            'Generate AI deepfake content for creative projects',
            'Swap faces in music videos or short films',
            'Create viral social media video content',
            'Test video production concepts quickly with AI',
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
