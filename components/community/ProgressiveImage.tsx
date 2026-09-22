'use client';

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';

import { cn } from '@/lib/utils';

/**
 * Cross-mount cache: tracks which image URLs have already been loaded
 * so re-mounting the component doesn't replay the fade-in transition.
 */
const loadedImages = new Set<string>();

type ProgressiveImageProps = {
  src: string;
  thumbSrc?: string;
  blurDataUrl?: string;
  alt: string;
  priority?: boolean;
  /**
   * Controls whether the full-resolution `src` image is ever loaded.
   * - `true` (default): full image loads after the thumbnail finishes.
   * - `false`: only the thumbnail is displayed; full image is never fetched.
   *   Use this for feed/grid cards where the detail view handles full-res.
   */
  loadFull?: boolean;
  className?: string;
  imgClassName?: string;
  /**
   * Responsive size hint for next/image srcset selection.
   * Pass a value matching your layout, e.g. "(max-width: 768px) 100vw, 33vw".
   * Defaults to '100vw'.
   */
  sizes?: string;
  /**
   * CSS aspect-ratio string to reserve space before the image loads,
   * preventing Cumulative Layout Shift (CLS).
   * Examples: "16/9", "4/3", "1/1", "1".
   *
   * When provided, the container uses `aspect-ratio` + `width: 100%` to
   * size itself intrinsically.  This is the recommended sizing mechanism.
   */
  aspectRatio?: string;
  /**
   * Explicit container width in **pixels**.
   * Use together with `height` as an alternative to `aspectRatio` for
   * fixed-size boxes. When both are provided and `aspectRatio` is not,
   * the aspect ratio is derived automatically.
   */
  width?: number;
  /**
   * Explicit container height in **pixels**.
   * Use together with `width` as an alternative to `aspectRatio`.
   */
  height?: number;
};

/** Shown once per src to avoid log spam. */
const warnedSrcs = new Set<string>();

export default function ProgressiveImage(props: ProgressiveImageProps) {
  const {
    src,
    thumbSrc,
    blurDataUrl,
    alt,
    priority = false,
    loadFull = true,
    className,
    imgClassName,
    sizes = '100vw',
    aspectRatio,
    width,
    height,
  } = props;

  const [thumbLoaded, setThumbLoaded] = useState(() =>
    thumbSrc ? loadedImages.has(thumbSrc) : true
  );
  const [fullLoaded, setFullLoaded] = useState(() => loadedImages.has(src));

  useEffect(() => {
    setThumbLoaded(thumbSrc ? loadedImages.has(thumbSrc) : true);
  }, [thumbSrc]);

  useEffect(() => {
    setFullLoaded(loadedImages.has(src));
  }, [src]);

  const shouldLoadFull = useMemo(() => {
    if (!loadFull) return false;
    if (priority) return true;
    if (!thumbSrc) return true;
    return thumbLoaded;
  }, [loadFull, priority, thumbLoaded, thumbSrc]);

  // Use next/image's built-in blur placeholder only when there's no thumbSrc
  // (so no thumbnail layer to act as the visual placeholder) and a blurDataUrl
  // is available. When thumbSrc IS present, the custom blur <div> + thumbnail
  // layer handle the placeholder duty.
  const fullImageUsesBlur = !thumbSrc && !!blurDataUrl;

  // Determine whether the caller provided an explicit sizing contract.
  // If `aspectRatio` is given directly, use it.  Otherwise derive from
  // width/height so the container always has an intrinsic aspect ratio.
  const hasExplicitDimensions = !!(width && height && width > 0 && height > 0);
  const resolvedAspectRatio: string | undefined = aspectRatio
    ? aspectRatio
    : hasExplicitDimensions
      ? `${width} / ${height}`
      : undefined;

  const hasExplicitSizing = !!(resolvedAspectRatio || hasExplicitDimensions);

  // Dev-only warning to surface CLS risk when no sizing props are provided.
  if (process.env.NODE_ENV === 'development' && !hasExplicitSizing && !warnedSrcs.has(src)) {
    warnedSrcs.add(src);
    // eslint-disable-next-line no-console
    console.warn(
      `[ProgressiveImage] No aspectRatio, width, or height provided for "${alt}" (src: ${src}). ` +
        'This may cause Cumulative Layout Shift (CLS). ' +
        'Pass aspectRatio="16/9" (or width + height) to reserve space.'
    );
  }

  // Build inline styles that reserve space for the image before it loads.
  const containerStyle = useMemo<CSSProperties>(() => {
    const style: CSSProperties = {};
    if (resolvedAspectRatio) {
      style.aspectRatio = resolvedAspectRatio;
    }
    if (width != null && width > 0) {
      style.width = width;
    }
    if (height != null && height > 0) {
      style.height = height;
    }
    return style;
  }, [resolvedAspectRatio, width, height]);

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-background-secondary',
        // When explicit sizing props are provided the container sizes itself;
        // otherwise preserve the original h-full w-full for backward compat
        // (relies on the parent already having defined dimensions).
        hasExplicitSizing ? 'w-full' : 'h-full w-full',
        className
      )}
      style={containerStyle}
    >
      {/* Custom blur placeholder layer — only when thumbSrc exists.
          Shown until either the thumbnail or full image has loaded. */}
      {blurDataUrl && thumbSrc && !thumbLoaded && !fullLoaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-110 blur-2xl opacity-70"
          style={{
            backgroundImage: `url(${blurDataUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}

      {/* Thumbnail layer — skip Next.js image optimization when the src is
          already our own resizing proxy (/api/media/thumb) which returns
          optimized WebP. This avoids double server-side processing. */}
      {thumbSrc && (
        <Image
          src={thumbSrc}
          alt={alt}
          fill
          sizes={sizes}
          priority={false}
          quality={40}
          unoptimized={thumbSrc.startsWith('/api/media/thumb')}
          placeholder="empty"
          className={cn(
            'transition-opacity duration-300',
            imgClassName ?? 'object-cover',
            thumbLoaded && !fullLoaded ? 'opacity-100' : 'opacity-0'
          )}
          onLoad={() => {
            loadedImages.add(thumbSrc);
            setThumbLoaded(true);
          }}
        />
      )}

      {/* Full-resolution layer — carries `priority` when set. */}
      {shouldLoadFull && (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          quality={80}
          placeholder={fullImageUsesBlur ? 'blur' : 'empty'}
          blurDataURL={fullImageUsesBlur ? blurDataUrl : undefined}
          className={cn(
            'transition-opacity duration-300',
            imgClassName ?? 'object-cover',
            fullLoaded ? 'opacity-100' : 'opacity-0'
          )}
          onLoad={() => {
            loadedImages.add(src);
            setFullLoaded(true);
          }}
        />
      )}
    </div>
  );
}
