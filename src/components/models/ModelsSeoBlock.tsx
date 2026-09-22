import type { FC } from 'react';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

export const MODELS_FAQ = [
  {
    q: 'What AI models are available on Veloura.ai?',
    a: 'Browse a growing library of community and curated models including Stable Diffusion 1.5, SDXL, Pony, Illustrious, and Flux checkpoints — plus hundreds of LoRAs covering realistic, anime, NSFW, and niche styles. Every model is hosted and ready to use without downloads or local installs.',
  },
  {
    q: 'Are the AI models free to use?',
    a: 'Yes. You can browse every model, preview sample images, and generate with free credits on sign-up. Paid plans unlock higher throughput, priority queue, and unlimited generations.',
  },
  {
    q: 'What is a LoRA model and how does it differ from a checkpoint?',
    a: 'A checkpoint is a full Stable Diffusion base model (several GB). A LoRA (Low-Rank Adaptation) is a small fine-tuning layer (10–150 MB) that rides on top of a checkpoint to add a specific style, character, or concept. You can stack multiple LoRAs on a single checkpoint to mix influences.',
  },
  {
    q: 'Can I use NSFW or uncensored models?',
    a: 'Yes. Veloura.ai supports NSFW and uncensored checkpoints and LoRAs for adult users. No safety filters block artistic, anatomical, or mature content between consenting adults.',
  },
  {
    q: 'Can I train my own model or upload a LoRA?',
    a: 'Yes. Visit the LoRA Training page to train a custom character or style model from your own images. Once trained, your LoRA is available in the generator alongside the public catalog.',
  },
  {
    q: 'How do I pick the right model for my image?',
    a: 'Use the category and style filters to narrow down. Realistic photography works best with photoreal checkpoints like Realistic Vision or Juggernaut. Anime and manga benefit from Pony, Illustrious, or NoobAI. Flux handles text-in-image and complex compositions. Click any model card to see example prompts and outputs.',
  },
];

const FEATURES = [
  {
    title: 'Stable Diffusion Checkpoints',
    body: 'SD 1.5, SDXL, Pony, Illustrious, Flux — curated base models covering photoreal, anime, cinematic, and stylized outputs.',
  },
  {
    title: 'LoRA Library',
    body: 'Hundreds of LoRAs for characters, clothing, poses, art styles, and NSFW concepts. Stack multiple on any compatible checkpoint.',
  },
  {
    title: 'NSFW & Uncensored',
    body: 'Dedicated NSFW checkpoints and LoRAs for mature art. No safety filters, no prompt censorship for adult users.',
  },
  {
    title: 'Preview Before You Generate',
    body: 'Every model card shows real sample outputs, tags, trigger words, and recommended settings so you pick with confidence.',
  },
  {
    title: 'Train Your Own',
    body: 'Upload reference images and train a custom LoRA of any character, face, or style. Your private model shows up alongside the public catalog.',
  },
  {
    title: 'One-Click Generate',
    body: 'Click any model to jump straight into the generator with the checkpoint pre-selected. No downloads, no local GPU needed.',
  },
];

const ModelsSeoBlock: FC = () => {
  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Veloura.ai Model Library',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    url: `${APP_URL}/models`,
    description:
      'Browse and use custom AI models including Stable Diffusion checkpoints, SDXL, Pony, Flux, and hundreds of LoRA models for uncensored AI art generation.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', ratingCount: '1420' },
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: MODELS_FAQ.map((item) => ({
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
      { '@type': 'ListItem', position: 2, name: 'AI Models', item: `${APP_URL}/models` },
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
              Custom AI Models, Checkpoints &amp; LoRAs — All in One Place
            </h2>
            <p className="mt-4 text-[0.95rem] leading-relaxed text-text-secondary">
              The Veloura.ai model library hosts community-trained and curated Stable Diffusion checkpoints,
              SDXL bases, Flux models, and a growing catalog of LoRAs. Every model is free to browse, runs entirely
              in the cloud, and is one click away from the generator — no downloads, no setup, no local GPU. Whether
              you want photoreal portraits, anime characters, cinematic scenes, or NSFW art, the right model is here.
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
              {MODELS_FAQ.map((item) => (
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

export default ModelsSeoBlock;
