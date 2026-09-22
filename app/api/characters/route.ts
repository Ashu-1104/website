import { NextResponse } from 'next/server';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const ABSOLUTE_URL_REGEX = /^https?:\/\//i;
const HOSTNAME_PATH_REGEX = /^(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?\//i;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
 * GET /api/characters
 *
 * Fetch a paginated list of AI characters.
 *
 * Query params:
 * - limit: Number of items to return (default: 20, max: 50)
 * - cursor: Pagination cursor for next page
 * - style: Filter by style (REALISTIC, ANIME, SEMI_REALISTIC, CARTOON)
 * - gender: Filter by gender (MALE, FEMALE, TRANS, OTHER)
 * - userId: Filter by owner (returns only that user's characters)
 * - includeNsfw: Include NSFW characters (default: false)
 *
 * Headers:
 * - x-vp-user-id: Current user's ID (for "my characters" queries)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseLimit(searchParams.get('limit'));
  const cursorRaw = searchParams.get('cursor');
  const styleFilter = searchParams.get('style');
  const genderFilter = searchParams.get('gender');
  const userIdFilter = searchParams.get('userId');
  const includeNsfw = searchParams.get('includeNsfw') === 'true';
  const searchQuery = searchParams.get('search')?.trim() ?? '';
  const mediaBaseUrl = (process.env.MEDIA_BASE_URL ?? '').replace(/\/+$/, '');

  // Parse cursor
  const cursor = cursorRaw ? decodeCursor(cursorRaw) : null;
  const cursorDate = cursor ? new Date(cursor.createdAt) : null;
  const cursorDateValid = cursorDate ? Number.isFinite(cursorDate.getTime()) : false;
  const cursorPayload =
    cursor && cursorDateValid && cursorDate
      ? { createdAt: cursorDate, id: cursor.id }
      : null;

  // Build where clause
  const where: Record<string, unknown> = {};

  // Style filter
  if (styleFilter && ['REALISTIC', 'ANIME', 'SEMI_REALISTIC', 'CARTOON'].includes(styleFilter)) {
    where.style = styleFilter;
  }

  // Gender filter
  if (genderFilter && ['MALE', 'FEMALE', 'TRANS', 'OTHER'].includes(genderFilter)) {
    where.gender = genderFilter;
  }

  // User filter (for "my characters")
  if (userIdFilter && UUID_REGEX.test(userIdFilter)) {
    where.userId = userIdFilter;
  }

  // NSFW filter
  if (!includeNsfw) {
    where.isNsfw = false;
  }

  // Search filter – match name or tags (case-insensitive)
  if (searchQuery) {
    where.AND = [
      ...(Array.isArray(where.AND) ? (where.AND as Record<string, unknown>[]) : []),
      {
        OR: [
          { name: { contains: searchQuery, mode: 'insensitive' } },
          { tags: { has: searchQuery } },
          { tags: { has: searchQuery.toLowerCase() } },
        ],
      },
    ];
  }

  // Cursor-based pagination
  if (cursorPayload) {
    where.AND = [
      ...(Array.isArray(where.AND) ? (where.AND as Record<string, unknown>[]) : []),
      {
        OR: [
          { createdAt: { lt: cursorPayload.createdAt } },
          { createdAt: cursorPayload.createdAt, id: { lt: cursorPayload.id } },
        ],
      },
    ];
  }

  const characters = await prisma.aICharacter.findMany({
    take: limit,
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
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

  const lastItem = characters.at(-1);
  const nextCursor =
    lastItem && characters.length === limit
      ? encodeCursor({ id: lastItem.id, createdAt: lastItem.createdAt.toISOString() })
      : null;

  // Transform response
  const items = characters.map((character) => {
    const resolvedAvatarUrl = resolveCharacterAvatarUrl({
      mediaBaseUrl,
      characterAvatarUrl: character.characterAvatarUrl,
      avatarAssetKey: character.avatarAsset?.r2Key ?? null,
      metadata: character.metadata,
    });

    return {
      id: character.id,
      name: character.name,
      description: character.description,
      age: character.age,
      style: character.style,
      gender: character.gender,
      ethnicity: character.ethnicity,
      bodyType: character.bodyType,
      tags: character.tags,
      isNsfw: character.isNsfw,
      likeCount: character.likeCount,
      favoriteCount: character.favoriteCount,
      usageCount: character.usageCount,
      createdAt: character.createdAt,
      characterAvatarUrl: resolvedAvatarUrl,
      avatarUrls: character.avatarUrls.length > 0
        ? character.avatarUrls.map((u) => buildMediaUrl(mediaBaseUrl, u) ?? u)
        : resolvedAvatarUrl
          ? [resolvedAvatarUrl]
          : [],
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
      metadata: character.metadata,
    };
  });

  return NextResponse.json({ items, nextCursor });
}

/**
 * POST /api/characters
 *
 * Create a new AI character.
 *
 * Headers:
 * - x-vp-user-id: Required. The user creating the character.
 *
 * Body (JSON):
 * - name: string (required)
 * - description: string (optional)
 * - age: number (required, must be >= 18)
 * - style: "REALISTIC" | "ANIME" | "SEMI_REALISTIC" | "CARTOON" (default: REALISTIC)
 * - gender: "MALE" | "FEMALE" | "TRANS" | "OTHER" (default: FEMALE)
 * - ethnicity: string (optional)
 * - bodyType: string (optional)
 * - breastSize: string (optional)
 * - buttSize: string (optional)
 * - tags: string[] (optional)
 * - isNsfw: boolean (default: false)
 * - voiceId: string (optional, preset voice identifier)
 * - voiceUrl: string (optional, custom uploaded voice URL)
 * - visibility: "PUBLIC" | "PRIVATE" (default: PUBLIC)
 * - creationMode: "quick" | "expert" (optional)
 * - firstMessage: string (optional)
 * - systemPrompt: string (optional)
 * - metadata: object (optional)
 */
export async function POST(request: Request) {
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';

  // Validate user ID
  if (!UUID_REGEX.test(userId)) {
    return NextResponse.json(
      { error: 'Unauthorized. Missing or invalid x-vp-user-id header.' },
      { status: 401 }
    );
  }

  // Verify user exists
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json(
      { error: 'User not found.' },
      { status: 404 }
    );
  }

  // ── Companion limit check ────────────────────────────────────────────────
  // Read the plan's maxCompanions from DB so admin changes take effect live.
  // -1 means unlimited (Premium plan).
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { plan: true },
  });

  const planConfig = subscription
    ? await prisma.planConfig.findUnique({
        where: { planKey: subscription.plan },
        select: { maxCompanions: true, name: true },
      })
    : null;

  // Fall back to free-plan limit (1) if no subscription record exists
  const maxCompanions = planConfig?.maxCompanions ?? 1;

  if (maxCompanions !== -1) {
    const existingCount = await prisma.aICharacter.count({ where: { userId } });

    if (existingCount >= maxCompanions) {
      return NextResponse.json(
        {
          error: `You have reached the limit of ${maxCompanions} AI companion${maxCompanions === 1 ? '' : 's'} on your ${planConfig?.name ?? 'current'} plan. Upgrade to create more.`,
          code: 'COMPANION_LIMIT_REACHED',
          limit: maxCompanions,
          current: existingCount,
        },
        { status: 403 }
      );
    }
  }
  // ── End companion limit check ────────────────────────────────────────────

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

  // Validate required fields
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json(
      { error: 'Name is required.' },
      { status: 400 }
    );
  }

  const age = typeof body.age === 'number' ? body.age : 18;
  if (age < 18) {
    return NextResponse.json(
      { error: 'Age must be at least 18.' },
      { status: 400 }
    );
  }

  // Validate enums
  const validStyles = ['REALISTIC', 'ANIME', 'SEMI_REALISTIC', 'CARTOON', 'FURRY', 'FANTASY'];
  const style = validStyles.includes(body.style as string) ? body.style : 'REALISTIC';

  const validGenders = ['MALE', 'FEMALE', 'TRANS', 'OTHER'];
  const gender = validGenders.includes(body.gender as string) ? body.gender : 'FEMALE';

  const validEthnicities = ['ASIAN', 'BLACK', 'CAUCASIAN', 'HISPANIC', 'INDIAN', 'MIDDLE_EASTERN', 'MIXED', 'OTHER'];
  const ethnicity = validEthnicities.includes(body.ethnicity as string) ? body.ethnicity : null;

  const validBodyTypes = ['SLIM', 'ATHLETIC', 'AVERAGE', 'CURVY', 'PLUS_SIZE'];
  const bodyType = validBodyTypes.includes(body.bodyType as string) ? body.bodyType : null;

  const validBreastSizes = ['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE'];
  const breastSize = validBreastSizes.includes(body.breastSize as string) ? body.breastSize : null;

  const validButtSizes = ['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE'];
  const buttSize = validButtSizes.includes(body.buttSize as string) ? body.buttSize : null;

  // Process optional fields
  const description = typeof body.description === 'string' ? body.description : null;
  const tags = Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === 'string') : [];
  const isNsfw = body.isNsfw === true;
  const voiceUrl = typeof body.voiceUrl === 'string' ? body.voiceUrl : null;
  const voiceId = typeof body.voiceId === 'string' ? body.voiceId : null;
  const firstMessage = typeof body.firstMessage === 'string' ? body.firstMessage : null;
  const systemPrompt = typeof body.systemPrompt === 'string' ? body.systemPrompt : null;
  const validVisibilities = ['PUBLIC', 'PRIVATE'];
  const visibility = validVisibilities.includes(body.visibility as string) ? (body.visibility as string) : 'PUBLIC';
  const validCreationModes = ['quick', 'expert'];
  const creationMode = validCreationModes.includes(body.creationMode as string) ? (body.creationMode as string) : null;
  const metadata =
    typeof body.metadata === 'object' && body.metadata !== null
      ? (body.metadata as Prisma.InputJsonValue)
      : undefined;

  // Resolve avatar URLs (multi-image support, up to 5)
  const rawAvatarUrls = Array.isArray(body.avatarUrls)
    ? body.avatarUrls.filter((u): u is string => typeof u === 'string' && u.trim() !== '').slice(0, 5)
    : [];

  // Resolve avatar image URL from top-level field or metadata fallback
  const rawImageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';
  const metaImageUrl =
    !rawImageUrl && metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? (typeof (metadata as Record<string, unknown>).imageUrl === 'string'
        ? ((metadata as Record<string, unknown>).imageUrl as string).trim()
        : '')
      : '';
  const imageUrl = rawImageUrl || metaImageUrl;

  // Build the avatarUrls array: prefer explicit array, fall back to single imageUrl
  const avatarUrls = rawAvatarUrls.length > 0
    ? rawAvatarUrls
    : imageUrl
      ? [imageUrl]
      : [];

  // Create the character
  const character = await prisma.aICharacter.create({
    data: {
      userId,
      userEmail: user.email ?? null,
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
      characterAvatarUrl: avatarUrls[0] || imageUrl || null,
      avatarUrls,
    },
    include: {
      user: {
        select: {
          id: true,
          handle: true,
        },
      },
    },
  });

  return NextResponse.json(
    {
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
        voiceId: character.voiceId,
        voiceUrl: character.voiceUrl,
        visibility: character.visibility,
        creationMode: character.creationMode,
        firstMessage: character.firstMessage,
        systemPrompt: character.systemPrompt,
        metadata: character.metadata,
        likeCount: character.likeCount,
        favoriteCount: character.favoriteCount,
        usageCount: character.usageCount,
        createdAt: character.createdAt,
        updatedAt: character.updatedAt,
        characterAvatarUrl: character.characterAvatarUrl,
        avatarUrls: character.avatarUrls,
        creator: {
          id: character.user.id,
          handle: character.user.handle,
        },
        avatarAsset: character.characterAvatarUrl
          ? { id: null, url: character.characterAvatarUrl, width: null, height: null }
          : null,
      },
    },
    { status: 201 }
  );
}
