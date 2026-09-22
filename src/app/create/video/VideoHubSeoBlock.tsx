import type { FC } from 'react';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

export const VIDEO_HUB_FAQ = [
  {
    q: 'What AI video tools are included?',
    a: 'Text-to-video generator, video editor, video background remover, reels maker, video dubbing, video upscaler (up to 8K), video reference generation, and motion transfer — all in one hub, all browser-based.',
  },
  {
    q: 'Can I generate AI videos from text prompts?',
    a: 'Yes. The AI Video Generator converts text prompts into short video clips using state-of-the-art text-to-video models. Describe a scene, set duration and aspect ratio, and generate in seconds.',
  },
  {
    q: 'What is motion transfer?',
    a: 'Motion transfer maps the movement from one video onto a still image of a person or character. Upload a dance clip and a photo — the AI animates your photo with the same motion.',
  },
  {
    q: 'Do video tools support NSFW output?',
    a: 'Yes. Veloura.ai supports NSFW and uncensored AI video generation for adult users. No filter blocks artistic or adult content.',
  },
  {
    q: 'Is the AI video upscaler real-ESRGAN based?',
    a: 'The video upscaler uses a combination of temporal super-resolution models optimized for video, including Real-ESRGAN derivatives and specialized video upscaling networks that maintain frame consistency.',
  },
  {
    q: 'What formats can I export?',
    a: 'MP4 is the default export. Videos come with no watermark on paid plans and watermarked preview on free-tier.',
  },
];

const TOOLS = [
  { title: 'AI Video Generator', body: 'Turn text prompts into AI-generated video clips. Cinematic, anime, realistic, or stylized.' },
  { title: 'Motion Transfer', body: 'Animate any photo with the motion from a reference video. Perfect for AI dance clips and character animation.' },
  { title: 'Video Background Remover', body: 'Replace or remove video backgrounds cleanly with AI masking across every frame.' },
  { title: 'Reels Maker', body: 'Turn images, clips, and prompts into short-form vertical videos ready for social.' },
  { title: 'Video Dubbing', body: 'Add AI voiceovers in multiple languages and voices. Sync to your clip.' },
  { title: 'Video Upscaler', body: 'Enhance video resolution up to 8K. Clean up old footage, upscale AI-generated clips, restore detail.' },
];

const VideoHubSeoBlock: FC = () => {
  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Veloura.ai — AI Video Tools',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    url: `${APP_URL}/create/video`,
    description:
      'Free AI video tools: text-to-video generator, video editor, motion transfer, video upscaler, reels maker, dubbing, and background remover. No restrictions.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', ratingCount: '1980' },
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: VIDEO_HUB_FAQ.map((item) => ({
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
      { '@type': 'ListItem', position: 2, name: 'Create', item: `${APP_URL}/create` },
      { '@type': 'ListItem', position: 3, name: 'Video', item: `${APP_URL}/create/video` },
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
              Free AI Video Tools — Generate, Edit, Upscale &amp; Animate
            </h2>
            <p className="mt-4 text-[0.95rem] leading-relaxed text-text-secondary">
              Turn ideas into videos without editing software or a local GPU. Veloura.ai gives you a full AI
              video toolkit: text-to-video generation, motion transfer, background removal, upscaling, dubbing, and
              reels creation — all in the browser. Free to start, with NSFW and uncensored support for adult users,
              and no watermark on paid plans.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {TOOLS.map((t) => (
              <div key={t.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <h3 className="text-base font-semibold text-white">{t.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{t.body}</p>
              </div>
            ))}
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white md:text-3xl">Frequently Asked Questions</h2>
            <div className="mt-5 space-y-4">
              {VIDEO_HUB_FAQ.map((item) => (
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

export default VideoHubSeoBlock;
