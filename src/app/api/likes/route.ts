import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const VALID_TYPES = [
  'CHARACTER',
  'COMMUNITY_ITEM',
  'MODEL',
  'AI_APP',
  'STYLE_TEMPLATE',
  'VIDEO_TEMPLATE',
] as const;

type LikeType = (typeof VALID_TYPES)[number];

/**
 * GET /api/likes
 *
 * Get user's likes.
 *
 * Headers:
 * - x-vp-user-id: Required.
 *
 * Query params:
 * - type: Filter by like type (optional)
 * - limit: Number of items (default: 50)
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
  const type = searchParams.get('type') as LikeType | null;
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

  const where: Record<string, unknown> = { userId };

  if (type && VALID_TYPES.includes(type)) {
    where.type = type;
  }

  const likes = await prisma.like.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      character: {
        select: { id: true, name: true, description: true, style: true },
      },
      communityItem: {
        include: { asset: true },
      },
      model: {
        select: { id: true, name: true, thumbnailUrl: true, modelType: true },
      },
      aiApp: {
        select: { id: true, slug: true, label: true, thumbnailUrl: true },
      },
      styleTemplate: {
        select: { id: true, slug: true, name: true, thumbnailUrl: true },
      },
      videoTemplate: {
        select: { id: true, slug: true, name: true, thumbnailUrl: true },
      },
    },
  });

  const items = likes.map((like) => ({
    id: like.id,
    type: like.type,
    createdAt: like.createdAt,
    item:
      like.character ||
      like.communityItem ||
      like.model ||
      like.aiApp ||
      like.styleTemplate ||
      like.videoTemplate,
  }));

  return NextResponse.json({ items });
}

/**
 * POST /api/likes
 *
 * Like an item.
 *
 * Headers:
 * - x-vp-user-id: Required.
 *
 * Body:
 * - type: LikeType (required)
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

  const type = body.type as LikeType;
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

  switch (type) {
    case 'CHARACTER':
      data.characterId = itemId;
      break;
    case 'COMMUNITY_ITEM':
      data.communityItemId = itemId;
      break;
    case 'MODEL':
      data.modelId = itemId;
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
    const like = await prisma.like.create({
      data: data as Parameters<typeof prisma.like.create>[0]['data'],
    });

    // Update like count on the target item
    await updateLikeCount(type, itemId, 1);

    return NextResponse.json({ like, liked: true }, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Already liked.' }, { status: 409 });
    }
    throw error;
  }
}

/**
 * DELETE /api/likes
 *
 * Unlike an item.
 *
 * Headers:
 * - x-vp-user-id: Required.
 *
 * Body:
 * - type: LikeType (required)
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

  const type = body.type as LikeType;
  const itemId = body.itemId as string;

  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Valid type is required.' }, { status: 400 });
  }

  if (!itemId || !UUID_REGEX.test(itemId)) {
    return NextResponse.json({ error: 'Valid itemId is required.' }, { status: 400 });
  }

  const where: Record<string, unknown> = {
    userId,
    type,
  };

  switch (type) {
    case 'CHARACTER':
      where.characterId = itemId;
      break;
    case 'COMMUNITY_ITEM':
      where.communityItemId = itemId;
      break;
    case 'MODEL':
      where.modelId = itemId;
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

  const deleted = await prisma.like.deleteMany({ where });

  if (deleted.count > 0) {
    await updateLikeCount(type, itemId, -1);
  }

  return NextResponse.json({ liked: false, deleted: deleted.count > 0 });
}

/**
 * Helper to update like count on target item
 */
async function updateLikeCount(type: LikeType, itemId: string, delta: number) {
  try {
    switch (type) {
      case 'CHARACTER':
        await prisma.aICharacter.update({
          where: { id: itemId },
          data: { likeCount: { increment: delta } },
        });
        break;
      case 'COMMUNITY_ITEM':
        await prisma.communityFeedItem.update({
          where: { id: itemId },
          data: { likeCount: { increment: delta } },
        });
        break;
      case 'MODEL':
        await prisma.userUploadedModel.update({
          where: { id: itemId },
          data: { likeCount: { increment: delta } },
        });
        break;
      case 'AI_APP':
        await prisma.aIApp.update({
          where: { id: itemId },
          data: { likeCount: { increment: delta } },
        });
        break;
      case 'STYLE_TEMPLATE':
        await prisma.styleTemplate.update({
          where: { id: itemId },
          data: { likeCount: { increment: delta } },
        });
        break;
      case 'VIDEO_TEMPLATE':
        await prisma.videoTemplate.update({
          where: { id: itemId },
          data: { likeCount: { increment: delta } },
        });
        break;
    }
  } catch {
    // Silently fail if item doesn't exist
  }
}
