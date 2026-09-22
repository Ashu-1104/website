function stripQueryAndHash(value: string) {
  const queryIndex = value.indexOf('?');
  const hashIndex = value.indexOf('#');
  const cutIndex = [queryIndex, hashIndex].filter((index) => index >= 0).sort((a, b) => a - b)[0];
  return cutIndex === undefined ? value : value.slice(0, cutIndex);
}

export function isDataUrl(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().startsWith('data:');
}

export function isGifUrl(value: string | null | undefined): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('data:image/gif')) return true;
  const normalized = stripQueryAndHash(trimmed).toLowerCase();
  return normalized.endsWith('.gif');
}

export function isVideoUrl(value: string | null | undefined): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('data:video/')) return true;
  const normalized = stripQueryAndHash(trimmed).toLowerCase();
  return (
    normalized.endsWith('.mp4') ||
    normalized.endsWith('.webm') ||
    normalized.endsWith('.mov') ||
    normalized.endsWith('.ogg')
  );
}

export function isImageUrl(value: string | null | undefined): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('data:image/')) return true;
  if (trimmed.startsWith('/images/')) return true;
  const normalized = stripQueryAndHash(trimmed).toLowerCase();
  return /\.(jpe?g|png|webp|gif|svg|bmp|ico|avif)$/.test(normalized);
}

