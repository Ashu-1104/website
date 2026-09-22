'use client';

import { useEffect, useState } from 'react';

interface LoraGalleryProps {
  images: string[];
  intervalMs?: number;
}

// Auto-rotating LoRA-output showcase. Cross-fades between images to
// demonstrate "train once, render consistently forever".
export default function LoraGallery({ images, intervalMs = 3000 }: LoraGalleryProps) {
  const [index, setIndex] = useState(0);
  const safe = images.filter(Boolean);

  useEffect(() => {
    if (safe.length < 2) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % safe.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [safe.length, intervalMs]);

  if (safe.length === 0) {
    return (
      <div className="aspect-[4/5] w-full rounded-2xl border border-white/8 bg-[#0d0d15]" />
    );
  }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-6 rounded-3xl bg-gradient-to-br from-[#a855f7]/15 via-transparent to-[#ff3e8a]/15 blur-2xl mesh-drift" />

      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0f] aspect-[4/5] shadow-2xl shadow-[#a855f7]/10">
        {safe.map((src, i) => (
          <img
            key={src + i}
            src={src}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[900ms] ease-out"
            style={{ opacity: i === index ? 1 : 0 }}
            loading={i === 0 ? 'eager' : 'lazy'}
          />
        ))}

        {/* legibility fade */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {/* top-left badge */}
        <span className="absolute left-4 top-4 rounded-full bg-[#a855f7] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-lg shadow-[#a855f7]/40">
          LoRA Output
        </span>

        {/* bottom caption */}
        <div className="absolute inset-x-0 bottom-0 p-5">
          <div className="rounded-xl border border-white/10 bg-black/55 p-4 backdrop-blur-md">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#a855f7]">Same Face. Every Frame.</p>
            <p className="mt-1 text-sm font-semibold text-white">Trained in ~10 minutes</p>
            <p className="mt-0.5 text-xs text-white/55">Switch base model. Your character stays consistent.</p>
          </div>
        </div>

        {/* position dots */}
        <div className="absolute left-1/2 top-4 flex -translate-x-1/2 gap-1.5">
          {safe.map((_, i) => (
            <span
              key={i}
              className="h-1 rounded-full transition-all duration-500"
              style={{
                width: i === index ? 18 : 6,
                background: i === index ? '#a855f7' : 'rgba(255,255,255,0.35)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
