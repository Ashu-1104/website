import type { AICharacter } from '@/types';

export const LOCAL_PARTNERS_STORAGE_KEY = 'vp:local-ai-characters';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function loadLocalPartners(): AICharacter[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(LOCAL_PARTNERS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => {
        if (!isRecord(item)) return null;

        const id = typeof item.id === 'string' ? item.id : '';
        const userId = typeof item.userId === 'string' ? item.userId : 'local-user';
        const name = typeof item.name === 'string' ? item.name : '';
        const imageDataUrl =
          typeof item.imageDataUrl === 'string'
            ? item.imageDataUrl
            : typeof item.image === 'string'
              ? item.image
              : '';
        const description = typeof item.description === 'string' ? item.description : undefined;
        const createdAtMs = typeof item.createdAt === 'number' ? item.createdAt : Date.now();
        const updatedAtMs = typeof item.updatedAt === 'number' ? item.updatedAt : createdAtMs;

        if (!id || !name || !imageDataUrl) return null;

        const character: AICharacter = {
          id,
          userId,
          name,
          image: imageDataUrl,
          thumbnailUrl: typeof item.thumbnailUrl === 'string' ? item.thumbnailUrl : imageDataUrl,
          description,
          createdAt: new Date(createdAtMs),
          updatedAt: new Date(updatedAtMs),
        };

        return character;
      })
      .filter((item): item is AICharacter => item !== null);
  } catch {
    return [];
  }
}

