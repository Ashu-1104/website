import Link from 'next/link';
import { Sparkles, Image as ImageIcon, Shield, Zap, Wand2, Layers, ArrowRight } from 'lucide-react';

// Rich SSR fallback rendered while <CreatePageContent /> hydrates. Crawlers index
// THIS content (the Suspense boundary below useSearchParams() emitted only
// "Loading..." before), and users briefly see it while the 2,100-line playground
// hydrates. Keep it a plain React FC — no hooks, no useSearchParams — so it
// can render on the server without bailing out of SSR.

const FEATURES = [
  {
    icon: Wand2,
    title: 'Text-to-Image Generation',
    desc: 'Type any prompt — even NSFW, uncensored, no filter. Get photorealistic or stylized AI art in seconds.',
  },
  {
    icon: ImageIcon,
    title: 'Image-to-Image Transformation',
    desc: 'Upload a photo and restyle it. Swap outfits, change backgrounds, or transform a portrait into anime.',
  },
  {
    icon: Layers,
    title: '50+ Checkpoint Models',
    desc: 'Flux, SDXL, Pony, Illustrious, Z Image — pick the base model that matches your style goal.',
  },
  {
    icon: Sparkles,
    title: 'LoRA Support',
    desc: 'Stack character and style LoRAs for consistent faces and signature aesthetics across generations.',
  },
  {
    icon: Shield,
    title: 'Zero Content Filters',
    desc: 'No safety filters, no blocked prompts, no watermarks. Generate anything — SFW or NSFW.',
  },
  {
    icon: Zap,
    title: 'Fast & Free to Try',
    desc: 'No sign-up required to browse. Create an account to generate — first credits free.',
  },
];

const HOW_IT_WORKS = [
  {
    step: '1',
    title: 'Pick a mode',
    desc: 'Choose Text-to-Image to generate from a prompt, or Image-to-Image to transform an existing photo.',
  },
  {
    step: '2',
    title: 'Choose a model',
    desc: 'Select from Flux (photoreal), SDXL (versatile), Pony / Illustrious (anime), or Z Image.',
  },
  {
    step: '3',
    title: 'Write your prompt',
    desc: 'Describe what you want. The generator has no restrictions — be explicit if you want NSFW output.',
  },
  {
    step: '4',
    title: 'Generate & download',
    desc: 'Results appear in under 30 seconds. Download in full resolution with no watermark.',
  },
];

export const CREATE_FAQ = [
  {
    q: 'Is this AI image generator really free?',
    a: 'Yes. Browsing is free without signup. Generating images requires a free account — new accounts get starter credits so you can try before subscribing. No credit card needed to start.',
  },
  {
    q: 'Does the generator have any content filters?',
    a: 'No. Unlike Midjourney, DALL-E, or Stable Diffusion Online, this generator has zero content filters. You can generate NSFW, uncensored, or explicit images with no blocked keywords or safety rejections.',
  },
  {
    q: 'What AI models can I use?',
    a: 'Flux (best photorealism), SDXL (general purpose), Pony & Illustrious (anime/stylized), and Z Image. You can also stack LoRA models for consistent character faces or signature art styles.',
  },
  {
    q: 'Can I generate NSFW images?',
    a: 'Yes. This is a no-filter, no-restriction AI image generator. NSFW prompts and explicit outputs are fully supported across all base models.',
  },
  {
    q: 'Do generated images have watermarks?',
    a: 'No. Every image is delivered in full resolution with no watermark, regardless of plan.',
  },
  {
    q: 'Is there an image-to-image mode?',
    a: 'Yes. Upload any photo and transform it — swap outfits, change backgrounds, restyle to anime, or apply NSFW transformations.',
  },
  {
    q: 'How long does it take to generate an image?',
    a: 'Most generations complete in 10–30 seconds depending on the model. Flux takes slightly longer for higher quality; SDXL and Pony are fastest.',
  },
  {
    q: 'Can I train my own custom model?',
    a: 'Yes — you can train a custom LoRA in ~10 minutes on paid plans. Upload 10–30 reference images of a character or style and the trained LoRA becomes available for consistent generation.',
  },
];

export default function CreateSeoShell() {
  return (
    <div className="app-layout-fallback" style={{ minHeight: '100vh', background: '#0a0a0f', color: 'white' }}>
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        {/* Hero */}
        <section style={{ textAlign: 'center', padding: '2rem 0 3rem' }}>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, lineHeight: 1.1, margin: 0 }}>
            Free AI Image Generator —{' '}
            <span style={{ background: 'linear-gradient(90deg,#ff3e8a,#a855f7,#ff8c42)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              No Filter. No Restrictions.
            </span>
          </h1>
          <p style={{ maxWidth: '42rem', margin: '1.25rem auto 0', fontSize: '1.05rem', color: 'rgba(255,255,255,0.72)', lineHeight: 1.6 }}>
            Generate any AI image from text — uncensored, NSFW, photorealistic or anime. Flux, SDXL, Pony &amp; LoRA
            support. No watermark, no sign-up required to browse, no content filters of any kind.
          </p>
          <div style={{ marginTop: '1.75rem', display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link
              href="/register"
              style={{ padding: '0.85rem 1.5rem', background: '#ff3e8a', color: 'white', borderRadius: '0.75rem', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              Start Generating Free <ArrowRight size={16} />
            </Link>
            <Link
              href="/ai-partner-lobby"
              style={{ padding: '0.85rem 1.5rem', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '0.75rem', textDecoration: 'none', fontWeight: 600 }}
            >
              Browse AI Companions
            </Link>
          </div>
        </section>

        {/* Features */}
        <section style={{ marginTop: '2rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, textAlign: 'center', margin: '0 0 1.5rem' }}>
            What You Can Generate
          </h2>
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '1.25rem', background: 'rgba(255,255,255,0.02)' }}>
                <Icon size={22} style={{ color: '#ff3e8a' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0.75rem 0 0.35rem' }}>{title}</h3>
                <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.55, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section style={{ marginTop: '3rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, textAlign: 'center', margin: '0 0 1.5rem' }}>
            How It Works
          </h2>
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {HOW_IT_WORKS.map(({ step, title, desc }) => (
              <div key={step} style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '1.25rem' }}>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#ff3e8a', lineHeight: 1 }}>{step}</div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0.5rem 0 0.35rem' }}>{title}</h3>
                <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.55, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section style={{ marginTop: '3rem', maxWidth: '48rem', margin: '3rem auto 0' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, textAlign: 'center', margin: '0 0 1.5rem' }}>
            Frequently Asked Questions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {CREATE_FAQ.map(({ q, a }) => (
              <details key={q} style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.02)' }}>
                <summary style={{ fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', listStyle: 'none' }}>{q}</summary>
                <p style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Loading hint (small) */}
        <div aria-live="polite" style={{ marginTop: '3rem', textAlign: 'center', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>
          Loading the AI image generator playground…
        </div>
      </main>
    </div>
  );
}
