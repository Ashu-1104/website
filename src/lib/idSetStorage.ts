export function readIdSet(storageKey: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return new Set();

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    const values = parsed
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean);
    return new Set(values);
  } catch {
    return new Set();
  }
}

export function writeIdSet(storageKey: string, ids: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(Array.from(ids)));
  } catch {}
}

