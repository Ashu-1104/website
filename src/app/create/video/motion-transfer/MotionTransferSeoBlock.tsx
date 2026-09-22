import type { FC } from 'react';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

export const MOTION_TRANSFER_FAQ = [
  {
    q: 'What is motion transfer?',
    a: 'Motion transfer maps the movement from one video onto a still image of a person or character. Upload a dance clip and a portrait — the AI animates the portrait with the same motion, expression, and rhythm.',
  },
  {
    q: 'Can I make AI dance videos with my photos?',
    a: 'Yes. That is the primary use case. Upload a photo of yourself, a character, or any AI-generated portrait, pair it with a reference dance clip, and generate a video of your character performing that dance.',
  },
  {
    q: 'Is it free?',
    a: 'Free credits on sign-up let you generate motion transfer clips right away. Paid plans unlock longer clips, higher resolution, and priority queue.',
  },
  {
    q: 'Does motion transfer support NSFW content?',
    a: 'Yes. Veloura.ai supports NSFW motion transfer for adult users. No safety filter blocks artistic or mature output.',
  },
  {
    q: 'How long can the output video be?',
    a: 'Clip length depends on the reference video length and plan. Free tier supports short clips (a few seconds); paid plans allow longer clips and higher frame rates.',
  },
  {
    q: 'What image and video formats are supported?',
    a: 'Upload JPEG, PNG, WebP, or GIF for the character image. Reference videos can be MP4, WebM, or MOV. The output is an MP4 at your selected resolution.',
  },
];

const FEATURES = [
  { title: 'AI Dance Videos', body: 'Drop in a dance clip and a character photo — generate AI dance videos in seconds.' },
  { title: 'Character Animation', body: 'Animate portraits, AI-generated characters, or any still image with motion from a reference video.' },
  { title: 'Consistent Identity', body: 'The character keeps their face, clothing, and style while taking on the motion of the reference.' },
  { title: 'NSFW Motion Transfer', body: 'Adult users can generate NSFW and uncensored motion-transfer clips without content filters.' },
  { title: 'Multiple Aspect Ratios', body: 'Vertical reels, square, landscape — export any format ready for social.' },
  { title: 'No Installs', body: 'Runs in the browser. No Photoshop, no After Effects, no local GPU required.' },
];

const MotionTransferSeoBlock: FC = () => {
  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Veloura.ai — AI Motion Transfer',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    url: `${APP_URL}/create/video/motion-transfer`,
    description:
      'Transfer motion from a reference video onto any photo or AI character. Create AI dance videos, character animations, and motion-matched clips. Free, NSFW supported.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', ratingCount: '980' },
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: MOTION_TRANSFER_FAQ.map((item) => ({
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
      { '@type': 'ListItem', position: 4, name: 'Motion Transfer', item: `${APP_URL}/create/video/motion-transfer` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <section
        style={{
          padding: '3rem 1.5rem',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          color: 'white',
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800, margin: 0 }}>
              AI Motion Transfer — Create AI Dance Videos &amp; Character Animation
            </h2>
            <p style={{ marginTop: '1rem', fontSize: '0.95rem', lineHeight: 1.7, color: 'rgba(255,255,255,0.72)' }}>
              Bring still images to life. Veloura.ai&apos;s motion transfer tool maps the movement from any
              reference video onto a character photo — perfect for AI dance clips, character animation, and
              motion-matched videos. Free to start, supports NSFW for adult users, and runs entirely in the browser.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {FEATURES.map((f) => (
              <div key={f.title} style={{ padding: '1.25rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', background: 'rgba(255,255,255,0.03)' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{f.title}</h3>
                <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.7)' }}>{f.body}</p>
              </div>
            ))}
          </div>

          <div>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800, margin: 0 }}>
              Frequently Asked Questions
            </h2>
            <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {MOTION_TRANSFER_FAQ.map((item) => (
                <details key={item.q} style={{ padding: '1.25rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', background: 'rgba(255,255,255,0.03)' }}>
                  <summary style={{ cursor: 'pointer', listStyle: 'none', fontWeight: 600 }}>{item.q}</summary>
                  <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', lineHeight: 1.7, color: 'rgba(255,255,255,0.72)' }}>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default MotionTransferSeoBlock;
