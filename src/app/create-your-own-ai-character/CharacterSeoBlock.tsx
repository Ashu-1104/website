import type { FC } from 'react';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

export const CHARACTER_FAQ = [
  {
    q: 'How do I create my own AI girlfriend or character?',
    a: 'Walk through the character creator step by step: pick a style (realistic, anime, fantasy, furry), choose gender and ethnicity, customize face, body, clothing, hair, and eyes, then set personality, voice, occupation, and relationship type. Your AI character saves to your account — generate photos, chat, and request new scenes anytime.',
  },
  {
    q: 'Is creating an AI character free?',
    a: 'Yes — character creation is free. Free credits let you generate images and start chatting right away. Paid plans unlock unlimited generations, premium voices, higher-resolution output, and advanced customization.',
  },
  {
    q: 'Can I create an NSFW or uncensored AI girlfriend?',
    a: 'Yes. Veloura.ai supports adult content for verified adult users. Your AI companion can appear in any outfit, state of undress, or scenario you choose — no safety filter blocks creative or mature content.',
  },
  {
    q: 'Can I customize my AI character’s personality and voice?',
    a: 'Yes. Choose from a range of personalities (sweet, shy, flirty, dominant, intellectual, playful, and more), pick a voice style, and define the relationship — girlfriend, best friend, coworker, tutor, or fully custom. Personality shapes how your AI companion chats and reacts.',
  },
  {
    q: 'Will my AI character look consistent across generations?',
    a: 'Yes. Once created, your character is locked in with a consistent face, body, hair, and style — every new image, outfit change, or scene keeps the same identity. This is what separates a proper AI companion from a one-off AI image.',
  },
  {
    q: 'Can I chat with my AI character after creating them?',
    a: 'Yes. Every character you create gets a paired AI chat. Send messages, ask for selfies, role-play scenes, and request custom pictures in-chat. Your character remembers context within a conversation.',
  },
  {
    q: 'Is my AI character private?',
    a: 'Yes. Characters you create are private to your account by default. You can optionally share selected images or videos to the community feed — nothing is shared unless you choose to.',
  },
];

const FEATURES = [
  { title: 'Full Visual Customization', body: 'Face shape, eye color, hair, body type, skin tone, outfit, accessories — every detail under your control.' },
  { title: '4 Art Styles', body: 'Realistic, anime, fantasy, or furry. Pick the aesthetic that matches your vibe and switch anytime.' },
  { title: 'Personality & Voice', body: 'Shy, flirty, dominant, intellectual, or custom — personality shapes how your AI companion chats and responds.' },
  { title: 'Consistent Character', body: 'Your character keeps the same face and body across every generation. No random outputs, no identity drift.' },
  { title: 'NSFW & Uncensored', body: 'Adult users can unlock full creative control — outfits, scenes, and scenarios with no safety filter.' },
  { title: 'Chat & Photo Requests', body: 'After creation, chat with your character or request custom photos and videos in-conversation.' },
];

const CharacterSeoBlock: FC = () => {
  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Veloura.ai — AI Character Creator',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    url: `${APP_URL}/create-your-own-ai-character`,
    description:
      'Create your own custom AI character, AI girlfriend, or virtual companion. Choose appearance, personality, voice, and style. Build your perfect AI partner — free to start.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.9', ratingCount: '5280' },
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: CHARACTER_FAQ.map((item) => ({
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
      { '@type': 'ListItem', position: 2, name: 'Create AI Character', item: `${APP_URL}/create-your-own-ai-character` },
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
          background: '#0a0a0f',
          color: 'white',
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
              Create Your Own AI Girlfriend, Companion &amp; Custom AI Character
            </h2>
            <p style={{ marginTop: '1rem', fontSize: '0.95rem', lineHeight: 1.7, color: 'rgba(255,255,255,0.72)' }}>
              Design the AI partner you actually want — not a preset. Veloura.ai&apos;s character creator lets
              you build a fully custom AI girlfriend, boyfriend, or virtual companion from the ground up: pick a style
              (realistic, anime, fantasy, or furry), customize every physical feature, set personality and voice, and
              define the relationship. Your character stays consistent across every image and chat. Free to start,
              with full NSFW and uncensored support for adult users.
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
              {CHARACTER_FAQ.map((item) => (
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

export default CharacterSeoBlock;
