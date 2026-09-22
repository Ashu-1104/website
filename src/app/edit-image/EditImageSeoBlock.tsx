import type { FC } from 'react';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

export const EDIT_IMAGE_FAQ = [
  {
    q: 'What is AI inpainting and how does this editor work?',
    a: 'AI inpainting erases and replaces parts of an image using a generative model. Upload any photo, paint over what you want to change with a mask, describe the replacement in a text prompt, and the AI fills the masked area in seconds — matching lighting, style, and surrounding detail.',
  },
  {
    q: 'Is the AI image editor free?',
    a: 'Yes. Free credits on sign-up let you edit images right away. Paid plans unlock higher-resolution output, batch editing, priority queue, and unlimited edits.',
  },
  {
    q: 'Can I remove objects, people, or blemishes from a photo?',
    a: 'Yes. Paint over what you want to erase and leave the prompt empty (or describe the clean background) — AI inpainting removes the object and rebuilds the area so it looks like it was never there.',
  },
  {
    q: 'Can I replace a face, outfit, or background?',
    a: 'Yes. Mask the face, clothing, or background and describe the replacement in the prompt — a new outfit, a different backdrop, a different facial feature, any clothing swap. The AI generates a seamless fill that matches the rest of the image.',
  },
  {
    q: 'Does this work for NSFW or uncensored edits?',
    a: 'Yes. Veloura.ai supports NSFW inpainting for adult users. You can modify clothing, add or remove coverage, or edit any area without safety filters blocking the output.',
  },
  {
    q: 'What image formats and sizes are supported?',
    a: 'Upload JPEG, PNG, WebP, or GIF up to 8 MB. Any aspect ratio works — portrait, landscape, or square. The editor preserves your original resolution in the output.',
  },
  {
    q: 'Do I need to install anything?',
    a: 'No. The AI image editor runs entirely in your browser. No Photoshop, no plugins, no local GPU required.',
  },
];

const FEATURES = [
  { title: 'AI Inpainting', body: 'Mask an area, describe the replacement, and the AI fills it in seconds — seamless with the surrounding image.' },
  { title: 'Generative Fill', body: 'Expand, extend, or reshape photos. Add new elements or reimagine scenes with text prompts.' },
  { title: 'Object Removal', body: 'Erase people, blemishes, watermarks, or unwanted objects cleanly. The background rebuilds automatically.' },
  { title: 'Face & Outfit Swap', body: 'Change faces, swap clothing, adjust hairstyles — keep the rest of the image intact.' },
  { title: 'NSFW Inpainting', body: 'Adult users can edit mature content without safety filters blocking the output.' },
  { title: 'No Installs', body: 'Runs in the browser. No Photoshop, no plugins, no local GPU — free to start.' },
];

const EditImageSeoBlock: FC = () => {
  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Veloura.ai — AI Image Editor',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    url: `${APP_URL}/edit-image`,
    description:
      'Edit any image with AI-powered inpainting and generative fill. Erase objects, replace areas, and transform photos — free online AI image editor.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', ratingCount: '1760' },
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: EDIT_IMAGE_FAQ.map((item) => ({
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
      { '@type': 'ListItem', position: 2, name: 'Edit Image', item: `${APP_URL}/edit-image` },
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
            <h1 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
              AI Image Editor — Edit Photos with AI Inpainting &amp; Generative Fill
            </h1>
            <p style={{ marginTop: '1rem', fontSize: '0.95rem', lineHeight: 1.7, color: 'rgba(255,255,255,0.72)' }}>
              Edit any image with AI. Erase objects, replace areas, swap outfits, change backgrounds, remove people,
              or reimagine entire scenes with a text prompt. Veloura.ai&apos;s AI image editor runs entirely in
              the browser — no Photoshop, no plugins, no local GPU. Free to start, supports NSFW inpainting for adult
              users, and exports at your original resolution with no watermark.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1rem',
            }}
          >
            {FEATURES.map((f) => (
              <div
                key={f.title}
                style={{
                  padding: '1.25rem',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '16px',
                  background: 'rgba(255,255,255,0.03)',
                }}
              >
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{f.title}</h3>
                <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.7)' }}>
                  {f.body}
                </p>
              </div>
            ))}
          </div>

          <div>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800, margin: 0 }}>
              Frequently Asked Questions
            </h2>
            <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {EDIT_IMAGE_FAQ.map((item) => (
                <details
                  key={item.q}
                  style={{
                    padding: '1.25rem',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '16px',
                    background: 'rgba(255,255,255,0.03)',
                  }}
                >
                  <summary style={{ cursor: 'pointer', listStyle: 'none', fontWeight: 600 }}>
                    {item.q}
                  </summary>
                  <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', lineHeight: 1.7, color: 'rgba(255,255,255,0.72)' }}>
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default EditImageSeoBlock;
