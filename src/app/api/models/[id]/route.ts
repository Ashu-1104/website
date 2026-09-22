import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * GET /api/models/[id]
 *
 * Fetch a single AI model by ID.
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id: idOrSlug } = params;
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';

  const normalizedSlug = slugify(idOrSlug);
  if (!UUID_REGEX.test(idOrSlug) && !normalizedSlug) {
    return NextResponse.json({ error: 'Invalid model identifier.' }, { status: 400 });
  }

  const model = await prisma.userUploadedModel.findUnique({
    where: UUID_REGEX.test(idOrSlug) ? { id: idOrSlug } : { slug: normalizedSlug },
    include: {
      user: {
        select: {
          id: true,
          handle: true,
          avatarUrl: true,
          bannerUrl: true,
          avatarDecoration: true,
          avatarDecorationUrl: true,
        },
      },
      thumbnails: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!model) {
    return NextResponse.json({ error: 'Model not found.' }, { status: 404 });
  }

  // Check visibility - allow owner or admin to see non-public models
  if (!model.isPublic && model.userId !== userId) {
    let isAdminUser = false;
    if (UUID_REGEX.test(userId)) {
      const viewer = await prisma.user.findUnique({
        where: { id: userId },
        select: { isAdmin: true, role: true },
      });
      isAdminUser = !!(viewer?.isAdmin || viewer?.role === 'ADMIN');
    }
    if (!isAdminUser) {
      return NextResponse.json({ error: 'Model not found.' }, { status: 404 });
    }
  }

  // Check if user has favorited/liked
  let isFavorited = false;
  let isLiked = false;

  if (UUID_REGEX.test(userId)) {
    const [favorite, like] = await Promise.all([
      prisma.favorite.findFirst({
        where: { userId, modelId: model.id, type: 'MODEL' },
      }),
      prisma.like.findFirst({
        where: { userId, modelId: model.id, type: 'MODEL' },
      }),
    ]);
    isFavorited = !!favorite;
    isLiked = !!like;
  }

  // Fetch all versions in this model group
  const rootId = model.parentModelId ?? model.id;
  const allVersions = await prisma.userUploadedModel.findMany({
    where: {
      OR: [{ id: rootId }, { parentModelId: rootId }],
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      slug: true,
      version: true,
      baseModel: true,
      thumbnailUrl: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
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
      seoTitle: model.seoTitle,
      seoDescription: model.seoDescription,
      tags: model.tags,
      trainingSteps: model.trainingSteps,
      trainingEpochs: model.trainingEpochs,
      isPublic: model.isPublic,
      isNsfw: model.isNsfw,
      downloads: model.downloads,
      likeCount: model.likeCount,
      favoriteCount: model.favoriteCount,
      usageCount: model.usageCount,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      parentModelId: model.parentModelId,
      creator: {
        id: model.user.id,
        handle: model.user.handle,
        avatarUrl: model.user.avatarUrl,
        bannerUrl: model.user.bannerUrl,
        avatarDecoration: model.user.avatarDecoration,
        avatarDecorationUrl: model.user.avatarDecorationUrl,
      },
      thumbnails: model.thumbnails.map((t) => ({
        id: t.id,
        imageUrl: t.imageUrl,
        sortOrder: t.sortOrder,
      })),
      versions: allVersions.map((v) => ({
        id: v.id,
        slug: v.slug,
        version: v.version,
        baseModel: v.baseModel,
        thumbnailUrl: v.thumbnailUrl,
        createdAt: v.createdAt,
        isCurrent: v.id === model.id,
      })),
      isFavorited,
      isLiked,
    },
  });
}

/**
 * PUT /api/models/[id]
 *
 * Update an AI model. Only the owner can update.
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id: idOrSlug } = params;
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';

  if (!UUID_REGEX.test(userId)) {
    return NextResponse.json(
      { error: 'Unauthorized. Missing or invalid x-vp-user-id header.' },
      { status: 401 }
    );
  }

  const normalizedSlug = slugify(idOrSlug);
  if (!UUID_REGEX.test(idOrSlug) && !normalizedSlug) {
    return NextResponse.json({ error: 'Invalid model identifier.' }, { status: 400 });
  }

  const existingModel = await prisma.userUploadedModel.findUnique({
    where: UUID_REGEX.test(idOrSlug) ? { id: idOrSlug } : { slug: normalizedSlug },
  });

  if (!existingModel) {
    return NextResponse.json({ error: 'Model not found.' }, { status: 404 });
  }

  // Allow owner or admin to update
  const requestingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isAdmin: true, role: true },
  });

  if (!requestingUser) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  const isOwner = existingModel.userId === userId;
  const isAdmin = requestingUser.isAdmin || requestingUser.role === 'ADMIN';

  if (!isOwner && !isAdmin) {
    return NextResponse.json(
      { error: 'Forbidden. You can only update your own models.' },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};

  if (typeof body.name === 'string' && body.name.trim()) {
    updateData.name = body.name.trim();
  }

  if (body.description !== undefined) {
    updateData.description = typeof body.description === 'string' ? body.description : null;
  }

  const validTypes = ['CHECKPOINT', 'LORA', 'EMBEDDING', 'VAE'];
  if (validTypes.includes(body.modelType as string)) {
    updateData.modelType = body.modelType;
  }

  const validBaseModels = ['SD_1_5', 'SDXL', 'FLUX', 'PONY', 'ILLUSTRIOUS'];
  if (validBaseModels.includes(body.baseModel as string)) {
    updateData.baseModel = body.baseModel;
  }

  if (body.version !== undefined) {
    updateData.version = typeof body.version === 'string' ? body.version : null;
  }

  if (body.slug !== undefined) {
    const normalized = typeof body.slug === 'string' ? slugify(body.slug) : '';
    updateData.slug = normalized || null;
  }

  const modelIdRaw = body.modelId !== undefined ? body.modelId : body.model_id;
  if (modelIdRaw !== undefined) {
    updateData.modelId = typeof modelIdRaw === 'string' ? modelIdRaw.trim() || null : null;
  }

  const loraModelRaw = body.loraModel !== undefined ? body.loraModel : body.lora_model;
  if (loraModelRaw !== undefined) {
    updateData.loraModel = typeof loraModelRaw === 'string' ? loraModelRaw.trim() || null : null;
  }

  if (body.badge !== undefined) {
    updateData.badge = typeof body.badge === 'string' ? body.badge : null;
  }

  if (body.thumbnailUrl !== undefined) {
    updateData.thumbnailUrl = typeof body.thumbnailUrl === 'string' ? body.thumbnailUrl : null;
  }

  if (body.downloadUrl !== undefined) {
    updateData.downloadUrl = typeof body.downloadUrl === 'string' ? body.downloadUrl : null;
  }

  if (typeof body.fileSize === 'number') {
    updateData.fileSize = BigInt(body.fileSize);
  }

  if (body.triggerWord !== undefined) {
    updateData.triggerWord = typeof body.triggerWord === 'string' ? body.triggerWord : null;
  }

  if (body.usageTips !== undefined) {
    updateData.usageTips = typeof body.usageTips === 'string' ? body.usageTips : null;
  }

  if (body.seoTitle !== undefined) {
    updateData.seoTitle = typeof body.seoTitle === 'string' ? body.seoTitle.trim() || null : null;
  }

  if (body.seoDescription !== undefined) {
    updateData.seoDescription = typeof body.seoDescription === 'string' ? body.seoDescription.trim() || null : null;
  }

  if (body.tags !== undefined) {
    updateData.tags = typeof body.tags === 'string' ? body.tags.trim() || null : null;
  }

  if (typeof body.isPublic === 'boolean') {
    updateData.isPublic = body.isPublic;
  }

  if (typeof body.isNsfw === 'boolean') {
    updateData.isNsfw = body.isNsfw;
  }

  // Handle thumbnails array – replaces all existing thumbnails for this model
  // Accepts: thumbnails: [{ imageUrl: string, sortOrder?: number }, ...]
  const thumbnailsInput = Array.isArray(body.thumbnails) ? body.thumbnails : null;
  const validThumbnails: { imageUrl: string; sortOrder: number }[] = [];

  if (thumbnailsInput) {
    for (let i = 0; i < Math.min(thumbnailsInput.length, 5); i++) {
      const t = thumbnailsInput[i];
      if (t && typeof t.imageUrl === 'string' && t.imageUrl.trim()) {
        validThumbnails.push({
          imageUrl: t.imageUrl.trim(),
          sortOrder: typeof t.sortOrder === 'number' ? t.sortOrder : i,
        });
      }
    }
  }

  if (Object.keys(updateData).length === 0 && validThumbnails.length === 0) {
    return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
  }

  if (updateData.slug) {
    const conflict = await prisma.userUploadedModel.findUnique({
      where: { slug: updateData.slug as string },
      select: { id: true },
    });
    if (conflict && conflict.id !== existingModel.id) {
      return NextResponse.json({ error: 'Slug already in use.' }, { status: 409 });
    }
  }

  // Use a transaction so model update + thumbnail replace are atomic
  const result = await prisma.$transaction(async (tx) => {
    // Update model fields (if any)
    if (Object.keys(updateData).length > 0) {
      await tx.userUploadedModel.update({
        where: { id: existingModel.id },
        data: updateData,
      });
    }

    // Replace thumbnails (if provided)
    if (validThumbnails.length > 0) {
      // Delete existing thumbnails for this model
      await tx.modelThumbnail.deleteMany({ where: { modelId: existingModel.id } });
      // Insert new thumbnails
      await tx.modelThumbnail.createMany({
        data: validThumbnails.map((t) => ({
          modelId: existingModel.id,
          imageUrl: t.imageUrl,
          sortOrder: t.sortOrder,
        })),
      });
    }

    // Re-fetch model with all relations
    return tx.userUploadedModel.findUniqueOrThrow({
      where: { id: existingModel.id },
      include: {
        user: { select: { id: true, handle: true } },
        thumbnails: { orderBy: { sortOrder: 'asc' } },
      },
    });
  });

  return NextResponse.json({
    model: {
      id: result.id,
      slug: (result as Record<string, unknown>).slug ?? null,
      name: result.name,
      description: result.description,
      modelType: result.modelType,
      baseModel: result.baseModel,
      version: result.version,
      modelId: (result as Record<string, unknown>).modelId ?? null,
      loraModel: (result as Record<string, unknown>).loraModel ?? null,
      badge: result.badge,
      thumbnailUrl: result.thumbnailUrl,
      downloadUrl: result.downloadUrl,
      fileSize: result.fileSize ? Number(result.fileSize) : null,
      triggerWord: result.triggerWord,
      usageTips: result.usageTips,
      isPublic: result.isPublic,
      isNsfw: result.isNsfw,
      downloads: result.downloads,
      likeCount: result.likeCount,
      favoriteCount: result.favoriteCount,
      usageCount: result.usageCount,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      creator: {
        id: result.user.id,
        handle: result.user.handle,
      },
      thumbnails: result.thumbnails.map((t) => ({
        id: t.id,
        imageUrl: t.imageUrl,
        sortOrder: t.sortOrder,
      })),
    },
  });
}

/**
 * DELETE /api/models/[id]
 *
 * Delete an AI model. Only the owner can delete.
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id: idOrSlug } = params;
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';

  if (!UUID_REGEX.test(userId)) {
    return NextResponse.json(
      { error: 'Unauthorized. Missing or invalid x-vp-user-id header.' },
      { status: 401 }
    );
  }

  const normalizedSlug = slugify(idOrSlug);
  if (!UUID_REGEX.test(idOrSlug) && !normalizedSlug) {
    return NextResponse.json({ error: 'Invalid model identifier.' }, { status: 400 });
  }

  const model = await prisma.userUploadedModel.findUnique({
    where: UUID_REGEX.test(idOrSlug) ? { id: idOrSlug } : { slug: normalizedSlug },
  });

  if (!model) {
    return NextResponse.json({ error: 'Model not found.' }, { status: 404 });
  }

  // Allow owner or admin to delete
  const delUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isAdmin: true, role: true },
  });

  const isDelOwner = model.userId === userId;
  const isDelAdmin = delUser?.isAdmin || delUser?.role === 'ADMIN';

  if (!isDelOwner && !isDelAdmin) {
    return NextResponse.json(
      { error: 'Forbidden. You can only delete your own models.' },
      { status: 403 }
    );
  }

  // If deleting a root model that has children, promote the oldest child to root
  if (!model.parentModelId) {
    const oldestChild = await prisma.userUploadedModel.findFirst({
      where: { parentModelId: model.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (oldestChild) {
      await prisma.$transaction([
        prisma.userUploadedModel.update({
          where: { id: oldestChild.id },
          data: { parentModelId: null },
        }),
        prisma.userUploadedModel.updateMany({
          where: { parentModelId: model.id, id: { not: oldestChild.id } },
          data: { parentModelId: oldestChild.id },
        }),
      ]);
    }
  }

  await prisma.userUploadedModel.delete({ where: { id: model.id } });

  return NextResponse.json({ message: 'Model deleted successfully.', id: model.id, slug: model.slug });
}
