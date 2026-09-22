'use client';

import { useEffect, useRef, useState } from 'react';

interface VideoRotatorProps {
  sources: string[];
  intervalMs?: number;
  className?: string;
}

// Cross-fades between a list of mp4 sources at a fixed interval.
// All <video> elements loop/play muted — swapping is purely an opacity
// crossfade, so there's no black flash between clips.
export default function VideoRotator({
  sources,
  intervalMs = 10000,
  className = '',
}: VideoRotatorProps) {
  const [index, setIndex] = useState(0);
  const refs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    if (sources.length < 2) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % sources.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [sources.length, intervalMs]);

  useEffect(() => {
    // Restart the now-visible video from the top so each rotation feels
    // like a fresh clip rather than picking up mid-playback.
    const node = refs.current[index];
    if (node) {
      try {
        node.currentTime = 0;
        void node.play();
      } catch {
        // ignore — autoplay policies will still loop the muted video
      }
    }
  }, [index]);

  return (
    <div className={`absolute inset-0 ${className}`}>
      {sources.map((src, i) => (
        <video
          key={src}
          ref={(el) => {
            refs.current[i] = el;
          }}
          src={src}
          autoPlay
          loop
          muted
          playsInline
          preload={i === 0 ? 'auto' : 'metadata'}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[900ms] ease-out"
          style={{ opacity: i === index ? 1 : 0 }}
        />
      ))}
    </div>
  );
}
