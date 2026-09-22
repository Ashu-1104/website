import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { AuthError, requireAdmin } from '@/lib/auth';
import { isValidUuid } from '@/lib/webhooks/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
 * GET /api/admin/characters
 *
 * List all AI characters with pagination and search.
 * Query params: page (default 1), limit (default 25), search (optional).
 */
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    throw error;
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '25', 10)));
  const search = searchParams.get('search')?.trim() ?? '';
  const skip = (page - 1) * limit;
  const mediaBaseUrl = (process.env.MEDIA_BASE_URL ?? '').replace(/\/+$/, '');

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { userEmail: { contains: search, mode: 'insensitive' as const } },
          { user: { email: { contains: search, mode: 'insensitive' as const } } },
          { user: { handle: { contains: search, mode: 'insensitive' as const } } },
        ],
      }
    : {};

  try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const includeClause: Record<string, any> = {
    user: { select: { id: true, handle: true, avatarUrl: true } },
    loraModel: { select: { id: true, name: true, loraModel: true, triggerWord: true } },
    avatarAsset: { select: { r2Key: true } },
  };

  let characters: Array<Record<string, unknown>>;
  let total: number;

  try {
    [characters, total] = await Promise.all([
      prisma.aICharacter.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: includeClause,
      }) as Promise<Array<Record<string, unknown>>>,
      prisma.aICharacter.count({ where }),
    ]);
  } catch {
    // Fallback: if loraModel relation is not available yet, query without it
    delete includeClause.loraModel;
    [characters, total] = await Promise.all([
      prisma.aICharacter.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: includeClause,
      }) as Promise<Array<Record<string, unknown>>>,
      prisma.aICharacter.count({ where }),
    ]);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatted = characters.map((c: any) => {
    const resolvedAvatarUrl = resolveCharacterAvatarUrl({
      mediaBaseUrl,
      characterAvatarUrl: typeof c.characterAvatarUrl === 'string' ? c.characterAvatarUrl : null,
      avatarAssetKey: typeof c.avatarAsset?.r2Key === 'string' ? c.avatarAsset.r2Key : null,
      metadata: c.metadata,
    });
    const avatarUrl: string | null = resolvedAvatarUrl;

    const user = c.user as { id: string; handle: string | null; avatarUrl: string | null } | null;
    const lora = c.loraModel as { id: string; name: string; loraModel: string | null; triggerWord: string | null } | null;

    return {
      id: c.id,
      userId: c.userId,
      name: c.name,
      description: c.description,
      age: c.age,
      gender: c.gender,
      style: c.style,
      bodyType: c.bodyType,
      breastSize: c.breastSize,
      buttSize: c.buttSize,
      ethnicity: c.ethnicity,
      isNsfw: c.isNsfw,
      visibility: c.visibility,
      tags: c.tags,
      systemPrompt: c.systemPrompt,
      firstMessage: c.firstMessage,
      voiceId: c.voiceId,
      voiceUrl: c.voiceUrl,
      favoriteCount: c.favoriteCount,
      likeCount: c.likeCount,
      usageCount: c.usageCount,
      creationMode: c.creationMode,
      loraModelId: c.loraModelId,
      avatarAssetId: c.avatarAssetId,
      avatarUrl,
      avatarUrls: Array.isArray(c.avatarUrls) ? c.avatarUrls : [],
      characterAvatarUrl: avatarUrl,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      creator: user ? { id: user.id, handle: user.handle, avatarUrl: user.avatarUrl } : null,
      loraModel: lora
        ? { id: lora.id, name: lora.name, loraModel: lora.loraModel, triggerWord: lora.triggerWord }
        : null,
    };
  });

  return NextResponse.json({
    characters: formatted,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
  } catch (error) {
    console.error('Failed to fetch characters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch characters.', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/characters
 *
 * Update a character by id.
 */
export async function PATCH(request: Request) {
  try {
    await requireAdmin(request);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    throw error;
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const targetId = typeof body.id === 'string' ? body.id.trim() : '';
  if (!isValidUuid(targetId)) {
    return NextResponse.json({ error: 'Valid character id is required.' }, { status: 400 });
  }

  const data: Record<string, unknown> = {};

  // Basic fields
  if (typeof body.name === 'string') data.name = body.name.trim();
  if (typeof body.description === 'string') data.description = body.description.trim() || null;
  if (typeof body.age === 'number') data.age = Math.max(18, body.age);
  if (typeof body.visibility === 'string') data.visibility = body.visibility;
  if (typeof body.creationMode === 'string') data.creationMode = body.creationMode.trim() || null;

  // Enums
  const validGenders = ['MALE', 'FEMALE', 'TRANS', 'OTHER'];
  if (typeof body.gender === 'string' && validGenders.includes(body.gender)) data.gender = body.gender;

  const validStyles = ['REALISTIC', 'ANIME', 'SEMI_REALISTIC', 'CARTOON', 'FURRY', 'FANTASY'];
  if (typeof body.style === 'string' && validStyles.includes(body.style)) data.style = body.style;

  const validBodyTypes = ['SLIM', 'ATHLETIC', 'AVERAGE', 'CURVY', 'PLUS_SIZE'];
  if (body.bodyType === null) data.bodyType = null;
  else if (typeof body.bodyType === 'string' && validBodyTypes.includes(body.bodyType)) data.bodyType = body.bodyType;

  const validBreastSizes = ['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE'];
  if (body.breastSize === null) data.breastSize = null;
  else if (typeof body.breastSize === 'string' && validBreastSizes.includes(body.breastSize)) data.breastSize = body.breastSize;

  const validButtSizes = ['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE'];
  if (body.buttSize === null) data.buttSize = null;
  else if (typeof body.buttSize === 'string' && validButtSizes.includes(body.buttSize)) data.buttSize = body.buttSize;

  const validEthnicities = ['ASIAN', 'BLACK', 'CAUCASIAN', 'HISPANIC', 'INDIAN', 'MIDDLE_EASTERN', 'MIXED', 'OTHER'];
  if (body.ethnicity === null) data.ethnicity = null;
  else if (typeof body.ethnicity === 'string' && validEthnicities.includes(body.ethnicity)) data.ethnicity = body.ethnicity;

  // Content
  if (typeof body.systemPrompt === 'string') data.systemPrompt = body.systemPrompt.trim() || null;
  if (typeof body.firstMessage === 'string') data.firstMessage = body.firstMessage.trim() || null;
  if (Array.isArray(body.tags)) data.tags = body.tags.filter((t: unknown): t is string => typeof t === 'string');
  if (typeof body.isNsfw === 'boolean') data.isNsfw = body.isNsfw;

  // Media
  if (typeof body.voiceId === 'string') data.voiceId = body.voiceId.trim() || null;
  if (typeof body.voiceUrl === 'string') data.voiceUrl = body.voiceUrl.trim() || null;
  if (typeof body.avatarUrl === 'string') data.characterAvatarUrl = body.avatarUrl.trim() || null;
  if (typeof body.characterAvatarUrl === 'string') data.characterAvatarUrl = body.characterAvatarUrl.trim() || null;

  // Avatar URLs array
  if (Array.isArray(body.avatarUrls)) {
    data.avatarUrls = body.avatarUrls.filter((u: unknown): u is string => typeof u === 'string' && u.trim() !== '');
    // Sync primary avatar
    if ((data.avatarUrls as string[]).length > 0 && !data.characterAvatarUrl) {
      data.characterAvatarUrl = (data.avatarUrls as string[])[0];
    }
  }

  // LoRA
  if (body.loraModelId === null || body.loraModelId === '') {
    data.loraModelId = null;
  } else if (typeof body.loraModelId === 'string' && isValidUuid(body.loraModelId)) {
    data.loraModelId = body.loraModelId;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
  }

  try {
    const updated = await prisma.aICharacter.update({
      where: { id: targetId },
      data,
    });
    return NextResponse.json({ success: true, character: updated });
  } catch (error) {
    console.error('Failed to update character:', error);
    return NextResponse.json({ error: 'Failed to update character.' }, { status: 500 });
  }
}

/**
 * POST /api/admin/characters
 *
 * Create a character as the admin user.
 */
export async function POST(request: Request) {
  let adminUser;
  try {
    adminUser = await requireAdmin(request);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    throw error;
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  }

  const age = typeof body.age === 'number' ? Math.max(18, body.age) : 18;
  const validStyles = ['REALISTIC', 'ANIME', 'SEMI_REALISTIC', 'CARTOON', 'FURRY', 'FANTASY'];
  const style = typeof body.style === 'string' && validStyles.includes(body.style) ? body.style : 'REALISTIC';
  const validGenders = ['MALE', 'FEMALE', 'TRANS', 'OTHER'];
  const gender = typeof body.gender === 'string' && validGenders.includes(body.gender) ? body.gender : 'FEMALE';
  const validEthnicities = ['ASIAN', 'BLACK', 'CAUCASIAN', 'HISPANIC', 'INDIAN', 'MIDDLE_EASTERN', 'MIXED', 'OTHER'];
  const ethnicity =
    body.ethnicity === null
      ? null
      : typeof body.ethnicity === 'string' && validEthnicities.includes(body.ethnicity)
        ? body.ethnicity
        : null;
  const validBodyTypes = ['SLIM', 'ATHLETIC', 'AVERAGE', 'CURVY', 'PLUS_SIZE'];
  const bodyType =
    body.bodyType === null
      ? null
      : typeof body.bodyType === 'string' && validBodyTypes.includes(body.bodyType)
        ? body.bodyType
        : null;
  const validBreastSizes = ['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE'];
  const breastSize =
    body.breastSize === null
      ? null
      : typeof body.breastSize === 'string' && validBreastSizes.includes(body.breastSize)
        ? body.breastSize
        : null;
  const validButtSizes = ['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE'];
  const buttSize =
    body.buttSize === null
      ? null
      : typeof body.buttSize === 'string' && validButtSizes.includes(body.buttSize)
        ? body.buttSize
        : null;

  const description = typeof body.description === 'string' ? body.description.trim() || null : null;
  const tags = Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === 'string') : [];
  const isNsfw = body.isNsfw === true;
  const voiceUrl = typeof body.voiceUrl === 'string' ? body.voiceUrl.trim() || null : null;
  const voiceId = typeof body.voiceId === 'string' ? body.voiceId.trim() || null : null;
  const firstMessage = typeof body.firstMessage === 'string' ? body.firstMessage.trim() || null : null;
  const systemPrompt = typeof body.systemPrompt === 'string' ? body.systemPrompt.trim() || null : null;
  const validVisibilities = ['PUBLIC', 'PRIVATE', 'UNLISTED'];
  const visibility =
    typeof body.visibility === 'string' && validVisibilities.includes(body.visibility)
      ? body.visibility
      : 'PUBLIC';
  const validCreationModes = ['quick', 'expert'];
  const creationMode =
    typeof body.creationMode === 'string' && validCreationModes.includes(body.creationMode)
      ? body.creationMode
      : null;

  const metadata = isRecord(body.metadata) ? (body.metadata as Prisma.InputJsonValue) : undefined;

  const avatarCandidates = [
    typeof body.characterAvatarUrl === 'string' ? body.characterAvatarUrl : '',
    typeof body.avatarUrl === 'string' ? body.avatarUrl : '',
    typeof body.imageUrl === 'string' ? body.imageUrl : '',
  ];
  const characterAvatarUrl = avatarCandidates.find((val) => val && val.trim())?.trim() ?? null;

  let loraModelId: string | null = null;
  if (typeof body.loraModelId === 'string' && isValidUuid(body.loraModelId)) {
    loraModelId = body.loraModelId;
  }

  try {
    const created = await prisma.aICharacter.create({
      data: {
        userId: adminUser.id,
        userEmail: adminUser.email ?? null,
        name,
        description,
        age,
        style: style as 'REALISTIC' | 'ANIME' | 'SEMI_REALISTIC' | 'CARTOON' | 'FURRY' | 'FANTASY',
        gender: gender as 'MALE' | 'FEMALE' | 'TRANS' | 'OTHER',
        ethnicity: ethnicity as 'ASIAN' | 'BLACK' | 'CAUCASIAN' | 'HISPANIC' | 'INDIAN' | 'MIDDLE_EASTERN' | 'MIXED' | 'OTHER' | null,
        bodyType: bodyType as 'SLIM' | 'ATHLETIC' | 'AVERAGE' | 'CURVY' | 'PLUS_SIZE' | null,
        breastSize: breastSize as 'SMALL' | 'MEDIUM' | 'LARGE' | 'EXTRA_LARGE' | null,
        buttSize: buttSize as 'SMALL' | 'MEDIUM' | 'LARGE' | 'EXTRA_LARGE' | null,
        tags,
        isNsfw,
        voiceId,
        voiceUrl,
        visibility,
        creationMode,
        firstMessage,
        systemPrompt,
        metadata,
        loraModelId,
        characterAvatarUrl,
      },
      include: {
        user: { select: { id: true, handle: true, avatarUrl: true } },
      },
    });

    return NextResponse.json({ character: created }, { status: 201 });
  } catch (error) {
    console.error('Failed to create character:', error);
    return NextResponse.json(
      { error: 'Failed to create character.', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/characters
 *
 * Delete a character by id.
 */
export async function DELETE(request: Request) {
  try {
    await requireAdmin(request);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    throw error;
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const targetId = typeof body.id === 'string' ? body.id.trim() : '';
  if (!isValidUuid(targetId)) {
    return NextResponse.json({ error: 'Valid character id is required.' }, { status: 400 });
  }

  try {
    await prisma.aICharacter.delete({ where: { id: targetId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete character:', error);
    return NextResponse.json({ error: 'Failed to delete character.' }, { status: 500 });
  }
}
