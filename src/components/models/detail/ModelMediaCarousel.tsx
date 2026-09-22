'use client';

import Image from 'next/image';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { isVideoUrl } from '@/lib/media';
import { cn } from '@/lib/utils';

export default function ModelMediaCarousel({ images, modelName }: { images: string[]; modelName: string }) {
  const safeImages = useMemo(() => images.filter(Boolean).slice(0, 6), [images]);
  const [activeIndex, setActiveIndex] = useState(0);
  const thumbsRef = useRef<HTMLDivElement | null>(null);

  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex < safeImages.length - 1;

  const goTo = useCallback((index: number) => {
    setActiveIndex(index);
    const container = thumbsRef.current;
    if (!container) return;
    const button = container.querySelector<HTMLElement>(`[data-thumb-index="${index}"]`);
    button?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, []);

  const goPrev = useCallback(() => {
    if (hasPrev) goTo(activeIndex - 1);
  }, [activeIndex, hasPrev, goTo]);

  const goNext = useCallback(() => {
    if (hasNext) goTo(activeIndex + 1);
  }, [activeIndex, hasNext, goTo]);

  const activeIsVideo = isVideoUrl(safeImages[activeIndex]);

  // Determine which indices to render: active + prev + next.
  // Adjacent images are rendered hidden so the browser loads them
  // through Next.js <Image> with the correct srcset for this device.
  const visibleIndices = useMemo(() => {
    const set = new Set<number>();
    set.add(activeIndex);
    if (activeIndex > 0) set.add(activeIndex - 1);
    if (activeIndex < safeImages.length - 1) set.add(activeIndex + 1);
    return set;
  }, [activeIndex, safeImages.length]);

  const previewSizes = '(max-width: 768px) 92vw, (max-width: 1024px) 95vw, (max-width: 1200px) 60vw, 640px';

  return (
    <div className="model-detail-media">
      <div className={cn('model-detail-preview', activeIsVideo && 'model-detail-preview--video')}>
        {safeImages.map((src, index) => {
          if (!visibleIndices.has(index)) return null;
          const isActive = index === activeIndex;
          const srcIsVideo = isVideoUrl(src);
          if (srcIsVideo) {
            return isActive ? (
              <video
                key={src}
                src={src}
                className="model-detail-preview-video"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                controls
              />
            ) : null;
          }
          return (
            <Image
              key={src}
              src={src}
              alt={modelName}
              fill
              priority={isActive}
              sizes={previewSizes}
              className={cn('object-contain', !isActive && 'invisible')}
            />
          );
        })}

        {safeImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              className={cn('model-detail-preview-nav model-detail-preview-nav-left', !hasPrev && 'opacity-0 pointer-events-none')}
              aria-label="Previous image"
              disabled={!hasPrev}
            >
              <ChevronLeft className="w-6 h-6" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={goNext}
              className={cn('model-detail-preview-nav model-detail-preview-nav-right', !hasNext && 'opacity-0 pointer-events-none')}
              aria-label="Next image"
              disabled={!hasNext}
            >
              <ChevronRight className="w-6 h-6" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {safeImages.length > 1 && (
        <div className="model-detail-thumbs">
          <div ref={thumbsRef} className="model-detail-thumbs-strip" aria-label="Model images">
            {safeImages.map((src, index) => {
              const thumbIsVideo = isVideoUrl(src);
              return (
                <button
                  key={`${src}-${index}`}
                  type="button"
                  data-thumb="true"
                  data-thumb-index={index}
                  onClick={() => goTo(index)}
                  className={cn('model-detail-thumb', index === activeIndex && 'model-detail-thumb-active')}
                  aria-label={`Select ${thumbIsVideo ? 'video' : 'image'} ${index + 1}`}
                  aria-pressed={index === activeIndex}
                >
                  {thumbIsVideo ? (
                    <video
                      src={src}
                      className="model-detail-thumb-video"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <Image src={src} alt="" fill sizes="160px" className="object-cover" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
