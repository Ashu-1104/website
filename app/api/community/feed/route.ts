export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const revalidate = 30; // 30s — feed updates frequently but can tolerate short cache

const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 80;
const ABSOLUTE_URL_REGEX = /^https?:\/\//i;

type CursorPayload = { createdAt: string; id: string };

function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as Partial<CursorPayload>;
    if (typeof parsed.createdAt !== 'string') return null;
    if (typeof parsed.id !== 'string') return null;
    return { createdAt: parsed.createdAt, id: parsed.id };
  } catch {
    return null;
  }
}

function parseLimit(raw: string | null): number {
  const parsed = raw ? Number.parseInt(raw, 10) : DEFAULT_LIMIT;
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, parsed));
}

function buildMediaUrl(baseUrl: string, key?: string | null) {
  if (!key) return null;
  if (ABSOLUTE_URL_REGEX.test(key)) return key;
  if (!baseUrl) return null;
  return `${baseUrl}/${key}`;
}

/**
 * Build a thumbnail URL via our resizing proxy.
 * Width 320 covers 240px cards at ~1.3x DPR; quality 70 gives good WebP results.
 */
function buildThumbUrl(
  fullUrl: string | null,
  width: number = 320,
  quality: number = 70,
): string | null {
  if (!fullUrl) return null;
  return `/api/media/thumb?src=${encodeURIComponent(fullUrl)}&w=${width}&q=${quality}`;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseLimit(searchParams.get('limit'));
  const cursorRaw = searchParams.get('cursor');
  const modelIdFilter = searchParams.get('modelId');
  const mediaBaseUrl = (process.env.MEDIA_BASE_URL ?? '').replace(/\/+$/, '');

  const cursor = cursorRaw ? decodeCursor(cursorRaw) : null;
  const cursorDate = cursor ? new Date(cursor.createdAt) : null;
  const cursorDateValid = cursorDate ? Number.isFinite(cursorDate.getTime()) : false;
  const cursorPayload =
    cursor && cursorDateValid && cursorDate
      ? { createdAt: cursorDate, id: cursor.id }
      : null;

  // Build where clause
  const where: Record<string, unknown> = {};

  if (cursorPayload) {
    where.OR = [
      { createdAt: { lt: cursorPayload.createdAt } },
      { createdAt: cursorPayload.createdAt, id: { lt: cursorPayload.id } },
    ];
  }

  // Filter by model ID (via CommunityFeedCheckpointModel join table)
  if (modelIdFilter && UUID_REGEX.test(modelIdFilter)) {
    where.checkpointModels = { some: { modelId: modelIdFilter } };
  }

  const items = await prisma.communityFeedItem.findMany({
    take: limit,
    where: Object.keys(where).length > 0 ? where : undefined,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: {
      asset: true,
      user: true,
    },
  });

  const lastItem = items.at(-1);
  const nextCursor = lastItem && items.length === limit
    ? encodeCursor({ id: lastItem.id, createdAt: lastItem.createdAt.toISOString() })
    : null;

  // Batch-fetch reaction counts for all items in this page
  const itemIds = items.map((i) => i.id);
  const reactionRows = itemIds.length > 0
    ? await prisma.communityFeedReaction.groupBy({
        by: ['itemId', 'emoji'],
        where: { itemId: { in: itemIds } },
        _count: { emoji: true },
      })
    : [];

  const reactionsMap = new Map<string, Array<{ emoji: string; count: number }>>();
  for (const row of reactionRows) {
    const list = reactionsMap.get(row.itemId) ?? [];
    list.push({ emoji: row.emoji, count: row._count.emoji });
    reactionsMap.set(row.itemId, list);
  }

  const withUrls = items.map((item) => {
    const assetUrl = buildMediaUrl(mediaBaseUrl, item.asset.r2Key);
    const posterUrl = buildMediaUrl(mediaBaseUrl, item.asset.posterKey);
    const previewUrl = buildMediaUrl(mediaBaseUrl, item.asset.previewKey);

    // For thumbnails, prefer previewUrl (likely already smaller), then posterUrl,
    // then fall back to assetUrl. Route through the resizing proxy for optimized WebP.
    const thumbSource = previewUrl ?? posterUrl ?? assetUrl;
    const thumbUrl = buildThumbUrl(thumbSource, 320, 70);

    return {
      ...item,
      creator: {
        id: item.user.id,
        handle: item.user.handle,
      },
      asset: {
        ...item.asset,
        url: assetUrl,
        posterUrl,
        previewUrl,
        thumbUrl,
      },
      reactions: reactionsMap.get(item.id) ?? [],
    };
  });

  return NextResponse.json({ items: withUrls, nextCursor });
}
