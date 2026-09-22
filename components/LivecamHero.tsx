'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';

const bannerImages = [
  {
    src: 'https://visualis-production.b-cdn.net/_nuxt/christmas-desktop.sOmrCRSj.webp',
    alt: 'AI companion platform — explore AI girlfriends and virtual partners',
  },
  {
    src: 'https://visualis-production.b-cdn.net/_nuxt/livecam-desktop.DfG-70wA.webp',
    alt: 'Live AI chat — connect with your virtual girlfriend in real time',
  },
  {
    src: 'https://visualis-production.b-cdn.net/_nuxt/gf-creator-desktop.DcrXkGZ4.webp',
    alt: 'Create your AI girlfriend — customize appearance, personality and voice',
  },
];

export default function LivecamHero() {
  const [activeSlide, setActiveSlide] = useState(0);

  // Auto-rotate slides every 3 seconds, pause when tab is hidden
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (!interval) {
        interval = setInterval(() => {
          setActiveSlide((prev) => (prev + 1) % bannerImages.length);
        }, 3000);
      }
    };

    const stop = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <section className="hero-slider">
      <div className="hero-slider-container">
        {bannerImages.map((image, index) => (
          <div
            key={image.src}
            className={`hero-slide ${index === activeSlide ? 'active' : ''}`}
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              style={{ objectFit: 'cover' }}
              priority={index === 0}
            />
          </div>
        ))}
      </div>
      <div className="hero-slider-dots">
        {bannerImages.map((_, index) => (
          <span
            key={index}
            className={`dot ${index === activeSlide ? 'active' : ''}`}
            onClick={() => setActiveSlide(index)}
          ></span>
        ))}
      </div>
    </section>
  );
}
