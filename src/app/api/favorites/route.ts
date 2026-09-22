import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const VALID_TYPES = [
  'IMAGE',
  'VIDEO',
  'MODEL',
  'CHARACTER',
  'COMMUNITY_ITEM',
  'AI_APP',
  'STYLE_TEMPLATE',
  'VIDEO_TEMPLATE',
] as const;

type FavoriteType = (typeof VALID_TYPES)[number];

/**
 * GET /api/favorites
 *
 * Get user's favorites.
 *
 * Headers:
 * - x-vp-user-id: Required.
 *
 * Query params:
 * - type: Filter by favorite type (optional)
 * - limit: Number of items (default: 50)
 * - cursor: Pagination cursor
 */
export async function GET(request: Request) {
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';

  if (!UUID_REGEX.test(userId)) {
    return NextResponse.json(
      { error: 'Unauthorized. Missing or invalid x-vp-user-id header.' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') as FavoriteType | null;
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

  const where: Record<string, unknown> = { userId };

  if (type && VALID_TYPES.includes(type)) {
    where.type = type;
  }

  // Only include the relation matching the type filter to avoid over-fetching
  const includeAll = !type || !VALID_TYPES.includes(type);
  const include = {
    mediaAsset: includeAll || type === 'IMAGE' || type === 'VIDEO',
    model: includeAll || type === 'MODEL'
      ? { select: { id: true, name: true, thumbnailUrl: true, modelType: true } as const }
      : false as const,
    character: includeAll || type === 'CHARACTER'
      ? { select: { id: true, name: true, description: true, style: true } as const }
      : false as const,
    communityItem: includeAll || type === 'COMMUNITY_ITEM'
      ? { include: { asset: true } as const }
      : false as const,
    aiApp: includeAll || type === 'AI_APP'
      ? { select: { id: true, slug: true, label: true, thumbnailUrl: true } as const }
      : false as const,
    styleTemplate: includeAll || type === 'STYLE_TEMPLATE'
      ? { select: { id: true, slug: true, name: true, thumbnailUrl: true } as const }
      : false as const,
    videoTemplate: includeAll || type === 'VIDEO_TEMPLATE'
      ? { select: { id: true, slug: true, name: true, thumbnailUrl: true } as const }
      : false as const,
  };

  const favorites = await prisma.favorite.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include,
  });

  const items = favorites.map((fav) => ({
    id: fav.id,
    type: fav.type,
    createdAt: fav.createdAt,
    item:
      fav.mediaAsset ||
      fav.model ||
      fav.character ||
      fav.communityItem ||
      fav.aiApp ||
      fav.styleTemplate ||
      fav.videoTemplate,
  }));

  return NextResponse.json({ items });
}

/**
 * POST /api/favorites
 *
 * Add an item to favorites.
 *
 * Headers:
 * - x-vp-user-id: Required.
 *
 * Body:
 * - type: FavoriteType (required)
 * - itemId: UUID of the item (required)
 */
export async function POST(request: Request) {
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';

  if (!UUID_REGEX.test(userId)) {
    return NextResponse.json(
      { error: 'Unauthorized. Missing or invalid x-vp-user-id header.' },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const type = body.type as FavoriteType;
  const itemId = body.itemId as string;

  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Valid type is required.' }, { status: 400 });
  }

  if (!itemId || !UUID_REGEX.test(itemId)) {
    return NextResponse.json({ error: 'Valid itemId is required.' }, { status: 400 });
  }

  // Build the data based on type
  const data: Record<string, unknown> = {
    userId,
    type,
  };

  // Set the appropriate relation field
  switch (type) {
    case 'IMAGE':
    case 'VIDEO':
      data.mediaAssetId = itemId;
      break;
    case 'MODEL':
      data.modelId = itemId;
      break;
    case 'CHARACTER':
      data.characterId = itemId;
      break;
    case 'COMMUNITY_ITEM':
      data.communityItemId = itemId;
      break;
    case 'AI_APP':
      data.aiAppId = itemId;
      break;
    case 'STYLE_TEMPLATE':
      data.styleTemplateId = itemId;
      break;
    case 'VIDEO_TEMPLATE':
      data.videoTemplateId = itemId;
      break;
  }

  try {
    const favorite = await prisma.favorite.create({
      data: data as Parameters<typeof prisma.favorite.create>[0]['data'],
    });

    // Best-effort count update — favorite already persisted
    await updateFavoriteCount(type, itemId, 1).catch((err) =>
      console.error('[favorites] Count update failed:', err)
    );

    return NextResponse.json({ favorite, favorited: true }, { status: 201 });
  } catch (error: unknown) {
    // Handle unique constraint violation (already favorited)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Already favorited.' }, { status: 409 });
    }
    throw error;
  }
}

/**
 * DELETE /api/favorites
 *
 * Remove an item from favorites.
 *
 * Headers:
 * - x-vp-user-id: Required.
 *
 * Body:
 * - type: FavoriteType (required)
 * - itemId: UUID of the item (required)
 */
export async function DELETE(request: Request) {
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';

  if (!UUID_REGEX.test(userId)) {
    return NextResponse.json(
      { error: 'Unauthorized. Missing or invalid x-vp-user-id header.' },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const type = body.type as FavoriteType;
  const itemId = body.itemId as string;

  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Valid type is required.' }, { status: 400 });
  }

  if (!itemId || !UUID_REGEX.test(itemId)) {
    return NextResponse.json({ error: 'Valid itemId is required.' }, { status: 400 });
  }

  // Build where clause based on type
  const where: Record<string, unknown> = {
    userId,
    type,
  };

  switch (type) {
    case 'IMAGE':
    case 'VIDEO':
      where.mediaAssetId = itemId;
      break;
    case 'MODEL':
      where.modelId = itemId;
      break;
    case 'CHARACTER':
      where.characterId = itemId;
      break;
    case 'COMMUNITY_ITEM':
      where.communityItemId = itemId;
      break;
    case 'AI_APP':
      where.aiAppId = itemId;
      break;
    case 'STYLE_TEMPLATE':
      where.styleTemplateId = itemId;
      break;
    case 'VIDEO_TEMPLATE':
      where.videoTemplateId = itemId;
      break;
  }

  const deleted = await prisma.favorite.deleteMany({ where });

  if (deleted.count > 0) {
    await updateFavoriteCount(type, itemId, -1);
  }

  return NextResponse.json({ favorited: false, deleted: deleted.count > 0 });
}

/**
 * Helper to update favorite count on target item
 */
async function updateFavoriteCount(type: FavoriteType, itemId: string, delta: number) {
  try {
    switch (type) {
      case 'CHARACTER':
        await prisma.aICharacter.update({
          where: { id: itemId },
          data: { favoriteCount: { increment: delta } },
        });
        break;
      case 'MODEL':
        await prisma.userUploadedModel.update({
          where: { id: itemId },
          data: { favoriteCount: { increment: delta } },
        });
        break;
      case 'AI_APP':
        await prisma.aIApp.update({
          where: { id: itemId },
          data: { favoriteCount: { increment: delta } },
        });
        break;
      case 'STYLE_TEMPLATE':
        await prisma.styleTemplate.update({
          where: { id: itemId },
          data: { favoriteCount: { increment: delta } },
        });
        break;
      case 'VIDEO_TEMPLATE':
        await prisma.videoTemplate.update({
          where: { id: itemId },
          data: { favoriteCount: { increment: delta } },
        });
        break;
    }
  } catch {
    // Silently fail if item doesn't exist (might have been deleted)
  }
}
