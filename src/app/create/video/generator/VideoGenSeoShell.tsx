import type { FC } from 'react';

export const VIDEO_GEN_FAQ = [
  {
    q: 'Is the AI video generator free?',
    a: 'Yes. Free credits on sign-up let you generate short AI video clips right away. Paid plans unlock higher resolution, longer duration, priority queue, and no watermark.',
  },
  {
    q: 'What AI video generation modes are supported?',
    a: 'Two core modes: Text-to-Video (describe a scene in a prompt and generate from scratch) and Image-to-Video (upload a still image and animate it). Both work in the browser — no downloads, no local GPU required.',
  },
  {
    q: 'Can I generate NSFW or uncensored AI videos?',
    a: 'Yes. Veloura.ai supports NSFW and uncensored AI video generation for adult users. No safety filter blocks artistic, adult, or mature content.',
  },
  {
    q: 'What aspect ratios and durations are supported?',
    a: 'Choose from 16:9, 9:16 (vertical reels), 1:1 (square), 4:3, and 3:4. Clip durations range from short 2–4 second loops to longer multi-second clips depending on the selected model and plan.',
  },
  {
    q: 'How long does video generation take?',
    a: 'Most clips generate in 30–90 seconds depending on length, resolution, and queue. Paid plans skip the free-tier queue and complete faster.',
  },
  {
    q: 'Can I use a reference image for image-to-video?',
    a: 'Yes. Upload any image — a character, scene, photo, or AI-generated still — and the AI animates it based on your text prompt and motion settings.',
  },
  {
    q: 'Are there templates to start from?',
    a: 'Yes. The playground ships with curated video templates covering cinematic, anime, dance, portrait motion, and stylized effects. Click any template to pre-fill the prompt and settings.',
  },
];

const FEATURES = [
  { title: 'Text-to-Video', body: 'Describe a scene in words — cinematic, anime, realistic, stylized — and generate a video clip from the prompt.' },
  { title: 'Image-to-Video', body: 'Upload a still image and animate it. Great for bringing portraits, characters, or AI art to life.' },
  { title: 'Multiple Aspect Ratios', body: '16:9, 9:16 vertical reels, 1:1 square, 4:3, 3:4 — match any platform.' },
  { title: 'Templates Library', body: 'Pre-built templates for cinematic scenes, dance, portraits, anime, and more — click to apply.' },
  { title: 'NSFW & Uncensored', body: 'Adult users unlock NSFW AI video generation with no safety filter.' },
  { title: 'No Watermark on Paid', body: 'Export clean MP4 at full resolution on paid plans. Free tier exports with preview watermark.' },
];

const VideoGenSeoShell: FC = () => {
  return (
    <div className="app-layout-fallback" style={{ minHeight: '100vh', background: '#0a0a0f', color: 'white' }}>
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        <section style={{ textAlign: 'center', padding: '2rem 0 3rem' }}>
          <h1
            style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontWeight: 900,
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            AI Video Generator —{' '}
            <span
              style={{
                background: 'linear-gradient(90deg,#ff3e8a,#a855f7,#ff8c42)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Text &amp; Image to Video
            </span>
          </h1>
          <p
            style={{
              maxWidth: '42rem',
              margin: '1.25rem auto 0',
              fontSize: '1.05rem',
              color: 'rgba(255,255,255,0.72)',
              lineHeight: 1.6,
            }}
          >
            Generate AI videos from text prompts or animate still images in seconds. Multiple aspect ratios, cinematic
            templates, NSFW and uncensored support for adult users. No installs, no watermark on paid plans.
          </p>
        </section>

        <section style={{ padding: '1rem 0 2.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 1.25rem' }}>
            What you can do with the AI Video Generator
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
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
        </section>

        <section style={{ padding: '0 0 3rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 1.25rem' }}>Frequently Asked Questions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {VIDEO_GEN_FAQ.map((item) => (
              <details
                key={item.q}
                style={{
                  padding: '1.25rem',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '16px',
                  background: 'rgba(255,255,255,0.03)',
                }}
              >
                <summary style={{ cursor: 'pointer', listStyle: 'none', fontWeight: 600 }}>{item.q}</summary>
                <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', lineHeight: 1.7, color: 'rgba(255,255,255,0.72)' }}>
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
          Loading video playground…
        </p>
      </main>
    </div>
  );
};

export default VideoGenSeoShell;
