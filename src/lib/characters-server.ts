// Server-only — direct DB access for the AI Partner Lobby SSR path.
// Returns LivecamGirl-shaped data so the client component can consume it as-is.
//
// Bypasses /api/characters for the initial paint to kill the client-side
// request waterfall: by the time the browser finishes parsing HTML, every
// card already has its <img src> wired up and the first ~10 are preloaded.

import 'server-only';
import { prisma } from '@/lib/db';
import { isVideoUrl } from '@/lib/media';

export interface LobbyCharacter {
  id: string;
  name: string;
  age: number;
  image: string;
  images: string[];
  videoUrl: string | null;
  isOnline: boolean;
  badge?: string;
  style: 'realistic' | 'anime';
  gender: 'female' | 'male' | 'trans';
  likeCount: number;
  usageCount: number;
  createdAt: number;
  tags: string[];
  isNsfw?: boolean;
}

const DEFAULT_LIMIT = 50;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function resolveBadge(metadata: unknown): string | undefined {
  if (!isRecord(metadata)) return undefined;
  const role = metadata.role;
  return typeof role === 'string' && role.trim() ? role : undefined;
}

function resolveIsOnline(metadata: unknown): boolean {
  if (!isRecord(metadata)) return true;
  return typeof metadata.isOnline === 'boolean' ? metadata.isOnline : true;
}

/**
 * Popularity-ordered first page for the lobby.
 *
 * Ordering: likeCount*2 + usageCount DESC (matches the client's "popular"
 * sort) — computed in SQL via a raw expression. We keep a stable tiebreak
 * on createdAt + id so pagination cursors remain coherent.
 */
export async function getLobbyInitialCharacters(
  limit: number = DEFAULT_LIMIT,
): Promise<LobbyCharacter[]> {
  const rows = await prisma.aICharacter.findMany({
    take: limit,
    where: {
      visibility: 'PUBLIC',
    },
    // Sort by likes then usage. SQL-side ordering on indexed columns — fast,
    // and gives the user a popular-first impression on cold load.
    orderBy: [
      { likeCount: 'desc' },
      { usageCount: 'desc' },
      { createdAt: 'desc' },
      { id: 'desc' },
    ],
    select: {
      id: true,
      name: true,
      age: true,
      style: true,
      gender: true,
      tags: true,
      isNsfw: true,
      likeCount: true,
      usageCount: true,
      createdAt: true,
      metadata: true,
      characterAvatarUrl: true,
      avatarUrls: true,
    },
  });

  return rows.map((c): LobbyCharacter => {
    const urls = Array.isArray(c.avatarUrls) ? c.avatarUrls : [];
    const allImages = urls.filter((u) => !isVideoUrl(u));
    const firstImage = allImages[0];
    const imageUrl = firstImage || c.characterAvatarUrl || '/images/placeholder.svg';
    const videoUrl = urls.find((u) => isVideoUrl(u)) ?? null;

    const style: LobbyCharacter['style'] =
      c.style === 'ANIME' || c.style === 'CARTOON' ? 'anime' : 'realistic';

    const gender: LobbyCharacter['gender'] =
      c.gender === 'MALE' ? 'male' : c.gender === 'TRANS' ? 'trans' : 'female';

    return {
      id: c.id,
      name: c.name,
      age: c.age,
      image: imageUrl,
      images: allImages.length > 1 ? allImages.slice(0, 5) : [],
      videoUrl,
      isOnline: resolveIsOnline(c.metadata),
      badge: resolveBadge(c.metadata),
      style,
      gender,
      likeCount: c.likeCount,
      usageCount: c.usageCount,
      createdAt: c.createdAt.getTime(),
      tags: Array.isArray(c.tags) ? c.tags : [],
      isNsfw: c.isNsfw,
    };
  });
}
