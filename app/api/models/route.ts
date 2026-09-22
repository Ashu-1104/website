import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CursorPayload = { createdAt: string; id: string };

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

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

/**
 * GET /api/models
 *
 * Fetch AI models (checkpoints, LoRAs, etc.).
 *
 * Query params:
 * - limit: Number of items (default: 20, max: 50)
 * - cursor: Pagination cursor
 * - type: Filter by model type (CHECKPOINT, LORA, EMBEDDING, VAE)
 * - baseModel: Filter by base model (SD_1_5, SDXL, FLUX, PONY, ILLUSTRIOUS)
 * - userId: Filter by uploader
 * - includeNsfw: Include NSFW models (default: false)
 * - publicOnly: Only show public models (default: true)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseLimit(searchParams.get('limit'));
  const cursorRaw = searchParams.get('cursor');
  const typeFilter = searchParams.get('type');
  const baseModelFilter = searchParams.get('baseModel');
  const userIdFilter = searchParams.get('userId');
  const includeNsfw = searchParams.get('includeNsfw') === 'true';
  const publicOnly = searchParams.get('publicOnly') !== 'false';
  const nameFilter = searchParams.get('name');
  const showAllVersions = searchParams.get('allVersions') === 'true';

  // Parse cursor
  const cursor = cursorRaw ? decodeCursor(cursorRaw) : null;
  const cursorDate = cursor ? new Date(cursor.createdAt) : null;
  const cursorDateValid = cursorDate ? Number.isFinite(cursorDate.getTime()) : false;
  const cursorPayload =
    cursor && cursorDateValid && cursorDate
      ? { createdAt: cursorDate, id: cursor.id }
      : null;

  const validTypes = ['CHECKPOINT', 'LORA', 'EMBEDDING', 'VAE'];
  const validBaseModels = ['SD_1_5', 'SDXL', 'FLUX', 'PONY', 'ILLUSTRIOUS'];

  // Build where clause
  const where: Record<string, unknown> = {};

  if (typeFilter && validTypes.includes(typeFilter)) {
    where.modelType = typeFilter;
  }

  if (baseModelFilter && validBaseModels.includes(baseModelFilter)) {
    where.baseModel = baseModelFilter;
  }

  if (userIdFilter && UUID_REGEX.test(userIdFilter)) {
    where.userId = userIdFilter;
  }

  if (!includeNsfw) {
    where.isNsfw = false;
  }

  if (publicOnly) {
    where.isPublic = true;
  }

  // Only show root models (group representatives) unless allVersions requested
  if (!showAllVersions) {
    where.parentModelId = null;
  }

  // Filter by name (case-insensitive, for admin auto-detect)
  if (nameFilter) {
    where.name = { equals: nameFilter, mode: 'insensitive' };
  }

  if (cursorPayload) {
    where.OR = [
      { createdAt: { lt: cursorPayload.createdAt } },
      { createdAt: cursorPayload.createdAt, id: { lt: cursorPayload.id } },
    ];
  }

  const models = await prisma.userUploadedModel.findMany({
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
      thumbnails: {
        orderBy: { sortOrder: 'asc' as const },
      },
      _count: {
        select: { childVersions: true },
      },
    },
  });

  const lastItem = models.at(-1);
  const nextCursor =
    lastItem && models.length === limit
      ? encodeCursor({ id: lastItem.id, createdAt: lastItem.createdAt.toISOString() })
      : null;

  const items = models.map((model) => ({
    id: model.id,
    slug: (model as Record<string, unknown>).slug ?? null,
    name: model.name,
    description: model.description,
    modelType: model.modelType,
    baseModel: model.baseModel,
    modelId: (model as Record<string, unknown>).modelId ?? null,
    loraModel: (model as Record<string, unknown>).loraModel ?? null,
    version: model.version,
    badge: model.badge,
    thumbnailUrl: model.thumbnailUrl,
    downloadUrl: model.downloadUrl,
    fileSize: model.fileSize ? Number(model.fileSize) : null,
    triggerWord: model.triggerWord,
    isPublic: model.isPublic,
    isNsfw: model.isNsfw,
    downloads: model.downloads,
    likeCount: model.likeCount,
    favoriteCount: model.favoriteCount,
    usageCount: model.usageCount,
    createdAt: model.createdAt,
    creator: {
      id: model.user.id,
      handle: model.user.handle,
      avatarUrl: model.user.avatarUrl,
    },
    thumbnails: model.thumbnails.map((t) => ({
      id: t.id,
      imageUrl: t.imageUrl,
      sortOrder: t.sortOrder,
    })),
    versionCount: model._count.childVersions + 1,
  }));

  return NextResponse.json({ items, nextCursor });
}

/**
 * POST /api/models
 *
 * Upload/register a new AI model.
 *
 * Headers:
 * - x-vp-user-id: Required. The user uploading the model.
 *
 * Body (JSON):
 * - slug: string (optional) - friendly URL slug, e.g. "qwen-edit"
 * - name: string (required)
 * - description: string (optional)
 * - modelType: CHECKPOINT | LORA | EMBEDDING | VAE (required)
 * - baseModel: SD_1_5 | SDXL | FLUX | PONY | ILLUSTRIOUS (required)
 * - modelId: string (optional) - image generation model_id (also accepts model_id)
 * - loraModel: string (optional) - image generation lora_model (also accepts lora_model)
 * - version: string (optional)
 * - badge: string (optional)
 * - thumbnailUrl: string (optional)
 * - downloadUrl: string (optional)
 * - fileSize: number (optional, in bytes)
 * - triggerWord: string (optional)
 * - usageTips: string (optional)
 * - isPublic: boolean (default: false)
 * - isNsfw: boolean (default: false)
 */
export async function POST(request: Request) {
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';

  if (!UUID_REGEX.test(userId)) {
    return NextResponse.json(
      { error: 'Unauthorized. Missing or invalid x-vp-user-id header.' },
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  // Validate required fields
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  }

  const slugRaw = typeof body.slug === 'string' ? body.slug : null;
  const requestedSlug = slugRaw ? slugify(slugRaw) : '';
  const baseSlug = requestedSlug || slugify(name);
  const wantsSlug = Boolean(baseSlug);

  const validTypes = ['CHECKPOINT', 'LORA', 'EMBEDDING', 'VAE'];
  const modelType = validTypes.includes(body.modelType as string) ? body.modelType : null;
  if (!modelType) {
    return NextResponse.json({ error: 'Valid modelType is required.' }, { status: 400 });
  }

  const validBaseModels = ['SD_1_5', 'SDXL', 'FLUX', 'PONY', 'ILLUSTRIOUS'];
  const baseModel = validBaseModels.includes(body.baseModel as string) ? body.baseModel : null;
  if (!baseModel) {
    return NextResponse.json({ error: 'Valid baseModel is required.' }, { status: 400 });
  }

  // Optional fields
  const description = typeof body.description === 'string' ? body.description : null;
  const seoTitle = typeof body.seoTitle === 'string' ? body.seoTitle.trim() || null : null;
  const seoDescription = typeof body.seoDescription === 'string' ? body.seoDescription.trim() || null : null;
  const tags = typeof body.tags === 'string' ? body.tags.trim() || null : null;
  const modelIdRaw =
    typeof body.modelId === 'string'
      ? body.modelId
      : typeof body.model_id === 'string'
        ? body.model_id
        : null;
  const loraModelRaw =
    typeof body.loraModel === 'string'
      ? body.loraModel
      : typeof body.lora_model === 'string'
        ? body.lora_model
        : null;
  const modelId = modelIdRaw ? modelIdRaw.trim() || null : null;
  const loraModel = loraModelRaw ? loraModelRaw.trim() || null : null;
  const version = typeof body.version === 'string' ? body.version : null;
  const badge = typeof body.badge === 'string' ? body.badge : null;
  const thumbnailUrl = typeof body.thumbnailUrl === 'string' ? body.thumbnailUrl : null;
  const downloadUrl = typeof body.downloadUrl === 'string' ? body.downloadUrl : null;
  const fileSize = typeof body.fileSize === 'number' ? BigInt(body.fileSize) : null;
  const triggerWord = typeof body.triggerWord === 'string' ? body.triggerWord : null;
  const usageTips = typeof body.usageTips === 'string' ? body.usageTips : null;
  const isPublic = body.isPublic === true;
  const isNsfw = body.isNsfw === true;

  // Auto-detect parent model: find existing root with same name + type
  let parentModelId: string | null = null;
  if (typeof body.parentModelId === 'string' && UUID_REGEX.test(body.parentModelId)) {
    parentModelId = body.parentModelId;
  } else {
    const existingRoot = await prisma.userUploadedModel.findFirst({
      where: {
        parentModelId: null,
        modelType: modelType as 'CHECKPOINT' | 'LORA' | 'EMBEDDING' | 'VAE',
        name: { equals: name, mode: 'insensitive' },
      },
      select: { id: true },
    });
    if (existingRoot) {
      parentModelId = existingRoot.id;
    }
  }

  let slug: string | null = null;
  if (wantsSlug) {
    let candidate = baseSlug;
    for (let i = 1; i <= 50; i += 1) {
      const existing = await prisma.userUploadedModel.findUnique({ where: { slug: candidate } });
      if (!existing) {
        slug = candidate;
        break;
      }
      candidate = `${baseSlug}-${i + 1}`;
    }
  }

  // Parse gallery thumbnails (up to 5)
  const thumbnailsInput = Array.isArray(body.thumbnails) ? body.thumbnails : null;
  const validThumbnails: { imageUrl: string; sortOrder: number }[] = [];
  if (thumbnailsInput) {
    for (let i = 0; i < Math.min(thumbnailsInput.length, 5); i++) {
      const t = thumbnailsInput[i] as Record<string, unknown> | undefined;
      if (t && typeof t.imageUrl === 'string' && (t.imageUrl as string).trim()) {
        validThumbnails.push({
          imageUrl: (t.imageUrl as string).trim(),
          sortOrder: typeof t.sortOrder === 'number' ? t.sortOrder : i,
        });
      }
    }
  }

  const model = await prisma.$transaction(async (tx) => {
    const created = await tx.userUploadedModel.create({
      data: {
        userId,
        slug,
        name,
        description,
        modelType: modelType as 'CHECKPOINT' | 'LORA' | 'EMBEDDING' | 'VAE',
        baseModel: baseModel as 'SD_1_5' | 'SDXL' | 'FLUX' | 'PONY' | 'ILLUSTRIOUS',
        modelId,
        loraModel,
        version,
        badge,
        thumbnailUrl,
        downloadUrl,
        fileSize,
        triggerWord,
        seoTitle,
        seoDescription,
        tags,
        usageTips,
        isPublic,
        isNsfw,
        parentModelId,
      },
      include: {
        user: {
          select: { id: true, handle: true },
        },
      },
    });

    // Create gallery thumbnails if provided
    if (validThumbnails.length > 0) {
      await tx.modelThumbnail.createMany({
        data: validThumbnails.map((t) => ({
          modelId: created.id,
          imageUrl: t.imageUrl,
          sortOrder: t.sortOrder,
        })),
      });
    }

    return created;
  });

  return NextResponse.json(
    {
      model: {
        id: model.id,
        slug: model.slug,
        name: model.name,
        description: model.description,
        modelType: model.modelType,
        baseModel: model.baseModel,
        modelId: model.modelId,
        loraModel: model.loraModel,
        version: model.version,
        badge: model.badge,
        thumbnailUrl: model.thumbnailUrl,
        downloadUrl: model.downloadUrl,
        fileSize: model.fileSize ? Number(model.fileSize) : null,
        triggerWord: model.triggerWord,
        usageTips: model.usageTips,
        isPublic: model.isPublic,
        isNsfw: model.isNsfw,
        downloads: model.downloads,
        likeCount: model.likeCount,
        favoriteCount: model.favoriteCount,
        usageCount: model.usageCount,
        createdAt: model.createdAt,
        updatedAt: model.updatedAt,
        creator: {
          id: model.user.id,
          handle: model.user.handle,
        },
      },
    },
    { status: 201 }
  );
}
