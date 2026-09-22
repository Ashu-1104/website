import type { FC } from 'react';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

export const AI_APPS_FAQ = [
  {
    q: 'Which AI apps are included?',
    a: 'Face swap (image and video), AI background remover, AI image upscaler, deepfake video maker, cloth swap, AI eraser, sketch-to-image, manga colorizer, AI avatar generator, AI filters, inpainting, and more. Every tool runs in the browser — no installs, no local GPU.',
  },
  {
    q: 'Are the AI tools free?',
    a: 'Yes. Every app includes free credits on sign-up. Paid plans unlock higher-resolution outputs, batch processing, priority queue, and unlimited generations.',
  },
  {
    q: 'Is the AI face swap safe to use?',
    a: 'The face swap runs on our servers. Uploaded images are processed for your session and not used to train models. You control what you generate and share. Do not use likenesses of real people without their consent — it violates our terms and most laws.',
  },
  {
    q: 'Does the AI background remover support transparent PNG output?',
    a: 'Yes. The AI background remover outputs a cutout with a transparent alpha channel (PNG) so you can drop the subject onto any new background in Photoshop, Canva, or any image editor.',
  },
  {
    q: 'How does the AI upscaler work?',
    a: 'The upscaler uses state-of-the-art super-resolution models (ESRGAN, SwinIR, and proprietary variants) to enlarge images up to 4× while reconstructing detail, sharpening edges, and cleaning up compression artifacts.',
  },
  {
    q: 'Do the tools support NSFW or uncensored content?',
    a: 'Yes. Unlike most mainstream AI tools, Veloura.ai supports NSFW face swap, cloth swap, inpainting, and generation for adult users. No safety filter blocks artistic or mature content.',
  },
  {
    q: 'Is deepfake video generation legal?',
    a: 'Deepfake tools are legal for personal, artistic, and educational use when you own the source footage or have consent. Using deepfakes to impersonate real people without consent, create non-consensual intimate imagery, or commit fraud is illegal in most jurisdictions and violates our terms of service.',
  },
];

const FEATURES = [
  { title: 'AI Face Swap', body: 'Swap faces in photos and videos with a single click. Works on selfies, group photos, and full-length clips.' },
  { title: 'Background Remover', body: 'Remove backgrounds cleanly with AI masking. Transparent PNG output, handles hair, fur, and soft edges.' },
  { title: 'AI Image Upscaler', body: 'Enlarge images up to 4× and reconstruct detail. Great for old photos, cropped stills, and AI-generated output.' },
  { title: 'Deepfake Video Maker', body: 'Generate deepfake videos by swapping a face into source footage. Full control, no watermark.' },
  { title: 'Cloth Swap', body: 'Change outfits, try on clothing, or adjust coverage with AI cloth swap. Supports NSFW for adult users.' },
  { title: 'AI Eraser & Inpainting', body: 'Remove objects, people, or blemishes from any photo. Paint over an area and AI fills in the background.' },
  { title: 'Sketch to Image', body: 'Turn line drawings, sketches, or rough concepts into finished illustrations or photoreal renders.' },
  { title: 'Manga Colorizer', body: 'Auto-color black-and-white manga pages, line art, and comic panels with AI that respects line work.' },
];

const AIAppsSeoBlock: FC = () => {
  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Veloura.ai — AI Apps & Tools',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    url: `${APP_URL}/ai-apps`,
    description:
      'Free AI image and video tools: face swap, background remover, upscaler, deepfake video maker, cloth swap, AI eraser, sketch to image, manga colorizer, and more. No restrictions.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', ratingCount: '2180' },
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: AI_APPS_FAQ.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: APP_URL },
      { '@type': 'ListItem', position: 2, name: 'AI Apps', item: `${APP_URL}/ai-apps` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <section className="mt-12 border-t border-white/10 pt-10">
        <div className="mx-auto max-w-4xl space-y-10">
          <div>
            <h2 className="text-2xl font-bold text-white md:text-3xl">
              Free AI Image &amp; Video Tools — Face Swap, Background Remover, Deepfake &amp; More
            </h2>
            <p className="mt-4 text-[0.95rem] leading-relaxed text-text-secondary">
              A full suite of AI image and video tools, all in the browser. Swap faces, remove backgrounds, upscale
              photos, generate deepfake clips, try on outfits, erase objects, color manga, turn sketches into finished
              art — without downloads, plugins, or a local GPU. Every tool is free to start, supports NSFW and
              uncensored use cases, and exports in high quality with no watermark.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <h3 className="text-base font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{f.body}</p>
              </div>
            ))}
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white md:text-3xl">Frequently Asked Questions</h2>
            <div className="mt-5 space-y-4">
              {AI_APPS_FAQ.map((item) => (
                <details key={item.q} className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <summary className="cursor-pointer list-none text-base font-semibold text-white marker:hidden">
                    {item.q}
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-text-secondary">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default AIAppsSeoBlock;
