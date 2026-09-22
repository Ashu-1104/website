import { NextResponse } from 'next/server';
import sharp from 'sharp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Allowlist: only proxy images from our own media CDN.
 * Built from MEDIA_BASE_URL at startup so it stays in sync with the feed API.
 */
const ALLOWED_ORIGINS: Set<string> = (() => {
  const origins = new Set<string>();

  // Add MEDIA_BASE_URL origin
  const base = (process.env.MEDIA_BASE_URL ?? '').replace(/\/+$/, '');
  if (base) {
    try { origins.add(new URL(base).origin); } catch {}
  }

  // Add any extra origins from THUMB_ALLOWED_ORIGINS (comma-separated)
  const extra = process.env.THUMB_ALLOWED_ORIGINS ?? '';
  for (const raw of extra.split(',')) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    try { origins.add(new URL(trimmed).origin); } catch {}
  }

  return origins;
})();

const MAX_UPSTREAM_BYTES = 20 * 1024 * 1024; // 20 MB
const UPSTREAM_TIMEOUT_MS = 10_000; // 10 seconds

/**
 * Simple in-memory LRU cache for processed thumbnails.
 * Avoids re-fetching and re-processing the same image on repeated requests.
 */
const CACHE_MAX_ENTRIES = 200;
const CACHE_MAX_BYTES = 50 * 1024 * 1024; // 50 MB total
const thumbCache = new Map<string, { data: Buffer; timestamp: number }>();
let cacheBytes = 0;

function evictCache() {
  while (cacheBytes > CACHE_MAX_BYTES || thumbCache.size > CACHE_MAX_ENTRIES) {
    const oldest = thumbCache.keys().next().value;
    if (oldest === undefined) break;
    const entry = thumbCache.get(oldest);
    if (entry) cacheBytes -= entry.data.byteLength;
    thumbCache.delete(oldest);
  }
}

function clampInt(value: string | null, min: number, max: number, fallback: number): number {
  const n = value ? Number.parseInt(value, 10) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const src = url.searchParams.get('src');
  const w = clampInt(url.searchParams.get('w'), 16, 1024, 320);
  const q = clampInt(url.searchParams.get('q'), 30, 90, 70);

  if (!src) {
    return NextResponse.json({ error: 'Missing src parameter' }, { status: 400 });
  }

  // --- Security: validate origin against allowlist ---
  let srcUrl: URL;
  try {
    srcUrl = new URL(src);
  } catch {
    return NextResponse.json({ error: 'Invalid src URL' }, { status: 400 });
  }

  if (ALLOWED_ORIGINS.size > 0 && !ALLOWED_ORIGINS.has(srcUrl.origin)) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 });
  }

  // --- Check in-memory cache ---
  const cacheKey = `${src}|${w}|${q}`;
  const cached = thumbCache.get(cacheKey);
  if (cached) {
    // Move to end (most recently used)
    thumbCache.delete(cacheKey);
    thumbCache.set(cacheKey, cached);
    return new NextResponse(new Uint8Array(cached.data), {
      status: 200,
      headers: {
        'Content-Type': 'image/webp',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400',
      },
    });
  }

  // --- Fetch upstream with timeout and size guard ---
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  let upstream: Response;
  try {
    upstream = await fetch(src, {
      headers: { Accept: 'image/*' },
      signal: controller.signal,
      cache: 'force-cache',
    });
  } catch (err) {
    clearTimeout(timeout);
    const message = err instanceof DOMException && err.name === 'AbortError'
      ? 'Upstream timeout'
      : 'Upstream fetch failed';
    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }

  if (!upstream.ok) {
    return NextResponse.json({ error: 'Upstream returned ' + upstream.status }, { status: 502 });
  }

  const contentType = upstream.headers.get('content-type') ?? '';
  if (!contentType.startsWith('image/')) {
    return NextResponse.json({ error: 'Not an image' }, { status: 415 });
  }

  const contentLength = Number(upstream.headers.get('content-length') ?? '0');
  if (contentLength > MAX_UPSTREAM_BYTES) {
    return NextResponse.json({ error: 'Upstream image too large' }, { status: 413 });
  }

  // Read body with secondary size guard (content-length can be absent or wrong)
  const arrayBuf = await upstream.arrayBuffer();
  if (arrayBuf.byteLength > MAX_UPSTREAM_BYTES) {
    return NextResponse.json({ error: 'Upstream image too large' }, { status: 413 });
  }

  const input = Buffer.from(arrayBuf);

  // --- Resize and convert to WebP ---
  let output: Buffer;
  try {
    output = await sharp(input)
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: q })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: 'Image processing failed' }, { status: 500 });
  }

  // --- Store in cache ---
  thumbCache.set(cacheKey, { data: output, timestamp: Date.now() });
  cacheBytes += output.byteLength;
  evictCache();

  return new NextResponse(new Uint8Array(output), {
    status: 200,
    headers: {
      'Content-Type': 'image/webp',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400',
    },
  });
}
