import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ABSOLUTE_URL_REGEX = /^https?:\/\//i;
const HOSTNAME_PATH_REGEX = /^(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?\//i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeMediaKey(key: string): string {
  let value = key.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  const lower = value.toLowerCase();
  if (lower === 'null' || lower === 'undefined') return '';
  return value;
}

function buildMediaUrl(baseUrl: string, key?: string | null): string | null {
  if (!key) return null;
  const trimmed = normalizeMediaKey(key);
  if (!trimmed) return null;
  if (trimmed.startsWith('data:')) return trimmed;
  if (trimmed.startsWith('//')) return trimmed;
  if (trimmed.startsWith('/')) return trimmed;
  if (ABSOLUTE_URL_REGEX.test(trimmed)) return trimmed;
  if (HOSTNAME_PATH_REGEX.test(trimmed)) return `https://${trimmed}`;
  if (!baseUrl) return null;
  return `${baseUrl}/${trimmed.replace(/^\/+/, '')}`;
}

function pickMediaString(value: unknown): string | null {
  if (typeof value === 'string') {
    const normalized = normalizeMediaKey(value);
    return normalized ? normalized : null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const picked = pickMediaString(item);
      if (picked) return picked;
    }
  }

  if (isRecord(value)) {
    const nestedCandidates = [
      value.url,
      value.src,
      value.href,
      value.imageUrl,
      value.image_url,
      value.avatarUrl,
      value.avatar_url,
    ];
    for (const nested of nestedCandidates) {
      const picked = pickMediaString(nested);
      if (picked) return picked;
    }
  }

  return null;
}

function extractLegacyAvatarUrl(metadata: unknown): string | null {
  if (!isRecord(metadata)) return null;

  const candidates = [
    metadata.imageUrl,
    metadata.image_url,
    metadata.avatarUrl,
    metadata.avatar_url,
    metadata.avatar,
    metadata.image,
    metadata.characterAvatarUrl,
    metadata.character_avatar_url,
    metadata.profileImageUrl,
    metadata.profile_image_url,
    metadata.thumbnailUrl,
    metadata.thumbnail_url,
  ];

  for (const value of candidates) {
    const picked = pickMediaString(value);
    if (picked) return picked;
  }
  return null;
}

function resolveCharacterAvatarUrl(params: {
  mediaBaseUrl: string;
  characterAvatarUrl: string | null;
  avatarAssetKey: string | null;
  metadata: unknown;
}): string | null {
  const legacy = extractLegacyAvatarUrl(params.metadata);
  return (
    buildMediaUrl(params.mediaBaseUrl, params.characterAvatarUrl) ||
    buildMediaUrl(params.mediaBaseUrl, params.avatarAssetKey) ||
    buildMediaUrl(params.mediaBaseUrl, legacy)
  );
}

/**
 * GET /api/characters/[id]
 *
 * Fetch a single AI character by ID.
 *
 * Params:
 * - id: Character UUID
 *
 * Headers:
 * - x-vp-user-id: Current user's ID (optional, used for personalized data like "isFavorited")
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';
  const mediaBaseUrl = (process.env.MEDIA_BASE_URL ?? '').replace(/\/+$/, '');

  // Validate character ID format
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      { error: 'Invalid character ID format.' },
      { status: 400 }
    );
  }

  const character = await prisma.aICharacter.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          handle: true,
          avatarUrl: true,
        },
      },
      loraModel: {
        select: {
          id: true,
          name: true,
          loraModel: true,
          triggerWord: true,
          modelId: true,
        },
      },
      avatarAsset: {
        select: {
          r2Key: true,
        },
      },
    },
  });

  if (!character) {
    return NextResponse.json(
      { error: 'Character not found.' },
      { status: 404 }
    );
  }

  // Check if current user has favorited/liked this character
  let isFavorited = false;
  let isLiked = false;

  if (UUID_REGEX.test(userId)) {
    const [favorite, like] = await Promise.all([
      prisma.favorite.findFirst({
        where: {
          userId,
          characterId: id,
          type: 'CHARACTER',
        },
      }),
      prisma.like.findFirst({
        where: {
          userId,
          characterId: id,
          type: 'CHARACTER',
        },
      }),
    ]);
    isFavorited = !!favorite;
    isLiked = !!like;
  }

  const resolvedAvatarUrl = resolveCharacterAvatarUrl({
    mediaBaseUrl,
    characterAvatarUrl: character.characterAvatarUrl,
    avatarAssetKey: character.avatarAsset?.r2Key ?? null,
    metadata: character.metadata,
  });

  return NextResponse.json({
    character: {
      id: character.id,
      name: character.name,
      description: character.description,
      age: character.age,
      style: character.style,
      gender: character.gender,
      ethnicity: character.ethnicity,
      bodyType: character.bodyType,
      breastSize: character.breastSize,
      buttSize: character.buttSize,
      tags: character.tags,
      isNsfw: character.isNsfw,
      voiceUrl: character.voiceUrl,
      firstMessage: character.firstMessage,
      systemPrompt: character.systemPrompt,
      metadata: character.metadata,
      characterAvatarUrl: resolvedAvatarUrl,
      avatarUrls: character.avatarUrls.length > 0
        ? character.avatarUrls.map((u) => buildMediaUrl(mediaBaseUrl, u) ?? u)
        : resolvedAvatarUrl
          ? [resolvedAvatarUrl]
          : [],
      likeCount: character.likeCount,
      favoriteCount: character.favoriteCount,
      usageCount: character.usageCount,
      createdAt: character.createdAt,
      updatedAt: character.updatedAt,
      creator: {
        id: character.user.id,
        handle: character.user.handle,
        avatarUrl: character.user.avatarUrl,
      },
      avatarAsset: resolvedAvatarUrl
        ? { id: null, url: resolvedAvatarUrl, width: null, height: null }
        : null,
      loraModel: character.loraModel
        ? {
            id: character.loraModel.id,
            name: character.loraModel.name,
            loraModelUrl: character.loraModel.loraModel,
            triggerWord: character.loraModel.triggerWord,
            modelId: character.loraModel.modelId,
          }
        : null,
      // Personalized fields
      isFavorited,
      isLiked,
    },
  });
}

/**
 * PUT /api/characters/[id]
 *
 * Update an existing AI character.
 * Only the owner can update their character.
 *
 * Params:
 * - id: Character UUID
 *
 * Headers:
 * - x-vp-user-id: Required. Must match the character's owner.
 *
 * Body (JSON): Same fields as POST, all optional.
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';

  // Validate user ID
  if (!UUID_REGEX.test(userId)) {
    return NextResponse.json(
      { error: 'Unauthorized. Missing or invalid x-vp-user-id header.' },
      { status: 401 }
    );
  }

  // Validate character ID format
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      { error: 'Invalid character ID format.' },
      { status: 400 }
    );
  }

  // Find the character
  const existingCharacter = await prisma.aICharacter.findUnique({
    where: { id },
  });

  if (!existingCharacter) {
    return NextResponse.json(
      { error: 'Character not found.' },
      { status: 404 }
    );
  }

  // Check ownership
  if (existingCharacter.userId !== userId) {
    return NextResponse.json(
      { error: 'Forbidden. You can only update your own characters.' },
      { status: 403 }
    );
  }

  // Parse request body
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body.' },
      { status: 400 }
    );
  }

  // Build update data (only include fields that are provided)
  const updateData: Record<string, unknown> = {};

  // Name
  if (typeof body.name === 'string' && body.name.trim()) {
    updateData.name = body.name.trim();
  }

  // Description
  if (body.description !== undefined) {
    updateData.description = typeof body.description === 'string' ? body.description : null;
  }

  // Age
  if (typeof body.age === 'number') {
    if (body.age < 18) {
      return NextResponse.json(
        { error: 'Age must be at least 18.' },
        { status: 400 }
      );
    }
    updateData.age = body.age;
  }

  // Style
  const validStyles = ['REALISTIC', 'ANIME', 'SEMI_REALISTIC', 'CARTOON'];
  if (validStyles.includes(body.style as string)) {
    updateData.style = body.style;
  }

  // Gender
  const validGenders = ['MALE', 'FEMALE', 'TRANS', 'OTHER'];
  if (validGenders.includes(body.gender as string)) {
    updateData.gender = body.gender;
  }

  // Ethnicity
  const validEthnicities = ['ASIAN', 'BLACK', 'CAUCASIAN', 'HISPANIC', 'INDIAN', 'MIDDLE_EASTERN', 'MIXED', 'OTHER'];
  if (body.ethnicity !== undefined) {
    updateData.ethnicity = validEthnicities.includes(body.ethnicity as string) ? body.ethnicity : null;
  }

  // Body Type
  const validBodyTypes = ['SLIM', 'ATHLETIC', 'AVERAGE', 'CURVY', 'PLUS_SIZE'];
  if (body.bodyType !== undefined) {
    updateData.bodyType = validBodyTypes.includes(body.bodyType as string) ? body.bodyType : null;
  }

  // Breast Size
  const validBreastSizes = ['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE'];
  if (body.breastSize !== undefined) {
    updateData.breastSize = validBreastSizes.includes(body.breastSize as string) ? body.breastSize : null;
  }

  // Butt Size
  const validButtSizes = ['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE'];
  if (body.buttSize !== undefined) {
    updateData.buttSize = validButtSizes.includes(body.buttSize as string) ? body.buttSize : null;
  }

  // Tags
  if (Array.isArray(body.tags)) {
    updateData.tags = body.tags.filter((t): t is string => typeof t === 'string');
  }

  // isNsfw
  if (typeof body.isNsfw === 'boolean') {
    updateData.isNsfw = body.isNsfw;
  }

  // Voice URL
  if (body.voiceUrl !== undefined) {
    updateData.voiceUrl = typeof body.voiceUrl === 'string' ? body.voiceUrl : null;
  }

  // First Message
  if (body.firstMessage !== undefined) {
    updateData.firstMessage = typeof body.firstMessage === 'string' ? body.firstMessage : null;
  }

  // System Prompt
  if (body.systemPrompt !== undefined) {
    updateData.systemPrompt = typeof body.systemPrompt === 'string' ? body.systemPrompt : null;
  }

  // Metadata
  if (body.metadata !== undefined) {
    updateData.metadata = typeof body.metadata === 'object' && body.metadata !== null ? body.metadata : null;
  }

  // Avatar URLs (multi-image support, up to 5)
  if (Array.isArray(body.avatarUrls)) {
    const avatarUrls = body.avatarUrls
      .filter((u): u is string => typeof u === 'string' && u.trim() !== '')
      .slice(0, 5);
    updateData.avatarUrls = avatarUrls;
    updateData.characterAvatarUrl = avatarUrls[0] || null;
  } else if (body.characterAvatarUrl !== undefined) {
    updateData.characterAvatarUrl = typeof body.characterAvatarUrl === 'string' ? body.characterAvatarUrl.trim() || null : null;
  } else if (body.imageUrl !== undefined) {
    updateData.characterAvatarUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() || null : null;
  }

  // Check if there's anything to update
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: 'No valid fields to update.' },
      { status: 400 }
    );
  }

  // Update the character
  const updatedCharacter = await prisma.aICharacter.update({
    where: { id },
    data: updateData,
    include: {
      user: {
        select: {
          id: true,
          handle: true,
        },
      },
    },
  });

  return NextResponse.json({
    character: {
      id: updatedCharacter.id,
      name: updatedCharacter.name,
      description: updatedCharacter.description,
      age: updatedCharacter.age,
      style: updatedCharacter.style,
      gender: updatedCharacter.gender,
      ethnicity: updatedCharacter.ethnicity,
      bodyType: updatedCharacter.bodyType,
      breastSize: updatedCharacter.breastSize,
      buttSize: updatedCharacter.buttSize,
      tags: updatedCharacter.tags,
      isNsfw: updatedCharacter.isNsfw,
      voiceUrl: updatedCharacter.voiceUrl,
      firstMessage: updatedCharacter.firstMessage,
      systemPrompt: updatedCharacter.systemPrompt,
      metadata: updatedCharacter.metadata,
      likeCount: updatedCharacter.likeCount,
      favoriteCount: updatedCharacter.favoriteCount,
      usageCount: updatedCharacter.usageCount,
      characterAvatarUrl: updatedCharacter.characterAvatarUrl,
      avatarUrls: updatedCharacter.avatarUrls,
      createdAt: updatedCharacter.createdAt,
      updatedAt: updatedCharacter.updatedAt,
      creator: {
        id: updatedCharacter.user.id,
        handle: updatedCharacter.user.handle,
      },
    },
  });
}

/**
 * DELETE /api/characters/[id]
 *
 * Delete an AI character.
 * Only the owner can delete their character.
 *
 * Params:
 * - id: Character UUID
 *
 * Headers:
 * - x-vp-user-id: Required. Must match the character's owner.
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';

  // Validate user ID
  if (!UUID_REGEX.test(userId)) {
    return NextResponse.json(
      { error: 'Unauthorized. Missing or invalid x-vp-user-id header.' },
      { status: 401 }
    );
  }

  // Validate character ID format
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      { error: 'Invalid character ID format.' },
      { status: 400 }
    );
  }

  // Find the character
  const character = await prisma.aICharacter.findUnique({
    where: { id },
  });

  if (!character) {
    return NextResponse.json(
      { error: 'Character not found.' },
      { status: 404 }
    );
  }

  // Check ownership
  if (character.userId !== userId) {
    return NextResponse.json(
      { error: 'Forbidden. You can only delete your own characters.' },
      { status: 403 }
    );
  }

  // Delete the character (cascades will handle related records based on schema)
  await prisma.aICharacter.delete({
    where: { id },
  });

  return NextResponse.json(
    { message: 'Character deleted successfully.', id },
    { status: 200 }
  );
}
