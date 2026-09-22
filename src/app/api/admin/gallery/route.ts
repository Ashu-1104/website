import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { AuthError, requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ABSOLUTE_URL_REGEX = /^https?:\/\//i;

/**
 * Fetch image dimensions by downloading the image and inspecting binary headers.
 * Supports JPEG, PNG, WebP, and GIF. Falls back to null on failure.
 */
async function fetchImageDimensions(
  url: string
): Promise<{ width: number; height: number } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 24) return null;

    // PNG: bytes 0-7 = signature, IHDR chunk at 16..23 has width (4 bytes) + height (4 bytes)
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }

    // GIF: 'GIF' magic at offset 0, width at 6 (LE 16-bit), height at 8 (LE 16-bit)
    if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
      return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
    }

    // WebP: 'RIFF' at 0, 'WEBP' at 8
    if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
      const chunk = buf.toString('ascii', 12, 16);
      if (chunk === 'VP8 ' && buf.length >= 30) {
        // Lossy: dimensions at 26-29
        return {
          width: buf.readUInt16LE(26) & 0x3fff,
          height: buf.readUInt16LE(28) & 0x3fff,
        };
      }
      if (chunk === 'VP8L' && buf.length >= 25) {
        // Lossless: bit-packed at offset 21
        const bits = buf.readUInt32LE(21);
        return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
      }
      if (chunk === 'VP8X' && buf.length >= 30) {
        // Extended: 24-bit LE at 24 and 27
        return {
          width: (buf[24] | (buf[25] << 8) | (buf[26] << 16)) + 1,
          height: (buf[27] | (buf[28] << 8) | (buf[29] << 16)) + 1,
        };
      }
    }

    // JPEG: scan for SOF markers
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      let offset = 2;
      while (offset < buf.length - 9) {
        if (buf[offset] !== 0xff) { offset++; continue; }
        const marker = buf[offset + 1];
        // SOF0–SOF3, SOF5–SOF7, SOF9–SOF11, SOF13–SOF15
        if (
          (marker >= 0xc0 && marker <= 0xc3) ||
          (marker >= 0xc5 && marker <= 0xc7) ||
          (marker >= 0xc9 && marker <= 0xcb) ||
          (marker >= 0xcd && marker <= 0xcf)
        ) {
          return { width: buf.readUInt16BE(offset + 7), height: buf.readUInt16BE(offset + 5) };
        }
        // Skip this segment
        const segLen = buf.readUInt16BE(offset + 2);
        offset += 2 + segLen;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * GET /api/admin/gallery
 *
 * Returns all models with their gallery image counts.
 * If ?modelId=<uuid> is provided, returns gallery items for that model.
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
  const modelId = searchParams.get('modelId')?.trim() ?? '';

  // If modelId provided, return gallery items for that model
  if (modelId && UUID_REGEX.test(modelId)) {
    const items = await prisma.communityFeedItem.findMany({
      where: {
        checkpointModels: { some: { modelId } },
      },
      include: {
        asset: true,
        loras: { include: { model: { select: { id: true, name: true, slug: true } } } },
        checkpointModels: {
          include: { model: { select: { id: true, name: true, slug: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const MEDIA_BASE_URL = process.env.MEDIA_BASE_URL ?? '';

    const mapped = items.map((item) => {
      let imageUrl = '';
      if (ABSOLUTE_URL_REGEX.test(item.asset.r2Key)) {
        imageUrl = item.asset.r2Key;
      } else if (MEDIA_BASE_URL) {
        imageUrl = `${MEDIA_BASE_URL}/${item.asset.r2Key}`;
      }

      // Find the first checkpoint link that has a model
      const cpLink = item.checkpointModels.find((cm) => cm.model);

      return {
        id: item.id,
        imageUrl,
        caption: item.caption,
        prompt: item.prompt,
        negativePrompt: item.negativePrompt,
        seed: item.seed,
        sampler: item.sampler,
        checkpointName: item.checkpointName,
        checkpoint: cpLink?.model
          ? { id: cpLink.model.id, name: cpLink.model.name, slug: cpLink.model.slug }
          : null,
        linkedModels: item.checkpointModels
          .filter((cm) => cm.model)
          .map((cm) => ({ id: cm.model!.id, name: cm.model!.name, slug: cm.model!.slug })),
        loras: item.loras.map((l) => ({
          id: l.id,
          name: l.name,
          version: l.version,
          weight: l.weight,
          model: l.model ? { id: l.model.id, name: l.model.name, slug: l.model.slug } : null,
        })),
        createdAt: item.createdAt,
      };
    });

    return NextResponse.json({ items: mapped });
  }

  // Otherwise return all models with image counts (checkpoint links + LoRA links)
  const models = await prisma.userUploadedModel.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      modelType: true,
      baseModel: true,
      thumbnailUrl: true,
      _count: { select: { checkpointModels: true, loraLinks: true } },
    },
    orderBy: { name: 'asc' },
  });

  const result = models.map((m) => ({
    id: m.id,
    name: m.name,
    slug: m.slug,
    modelType: m.modelType,
    baseModel: m.baseModel,
    thumbnailUrl: m.thumbnailUrl,
    imageCount: m._count.checkpointModels + m._count.loraLinks,
  }));

  return NextResponse.json({ models: result });
}

/**
 * POST /api/admin/gallery
 *
 * Manually add an image to a model's gallery with full generation metadata.
 *
 * Body:
 * - modelId: string (optional) - checkpoint model to link to
 * - imageUrl: string (required) - the image URL
 * - caption: string (optional)
 * - prompt: string (optional)
 * - negativePrompt: string (optional)
 * - seed: string (optional)
 * - sampler: string (optional)
 * - checkpointModelId: string (optional) - the checkpoint UserUploadedModel id
 * - loras: Array<{ modelId?: string; name: string; weight?: number }> (optional)
 * - userId: string (required) - the user who "posted" it
 */
export async function POST(request: Request) {
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

  const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';
  const caption = typeof body.caption === 'string' ? body.caption.trim() : null;
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : null;
  const negativePrompt = typeof body.negativePrompt === 'string' ? body.negativePrompt.trim() : null;
  const seed = typeof body.seed === 'string' ? body.seed.trim() : null;
  const sampler = typeof body.sampler === 'string' ? body.sampler.trim() : null;
  const checkpointModelId = typeof body.checkpointModelId === 'string' ? body.checkpointModelId.trim() : '';
  const modelId = typeof body.modelId === 'string' ? body.modelId.trim() : '';
  const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
  const loras = Array.isArray(body.loras) ? body.loras : [];

  if (!imageUrl || !ABSOLUTE_URL_REGEX.test(imageUrl)) {
    return NextResponse.json({ error: 'Valid imageUrl is required.' }, { status: 400 });
  }
  if (!UUID_REGEX.test(userId)) {
    return NextResponse.json({ error: 'Valid userId is required.' }, { status: 400 });
  }

  // Determine the checkpoint model to link
  const effectiveCheckpointId = checkpointModelId && UUID_REGEX.test(checkpointModelId)
    ? checkpointModelId
    : modelId && UUID_REGEX.test(modelId)
      ? modelId
      : null;

  // Collect ALL unique model IDs that should get a checkpoint-model link.
  // This includes: the model being managed (modelId) and the explicit checkpoint model.
  const allModelIds = new Set<string>();
  if (modelId && UUID_REGEX.test(modelId)) allModelIds.add(modelId);
  if (checkpointModelId && UUID_REGEX.test(checkpointModelId)) allModelIds.add(checkpointModelId);

  // Also add LoRA model IDs as checkpoint-model links so the image appears in LoRA galleries too.
  for (const lora of loras) {
    const loraModelId = typeof lora.modelId === 'string' ? lora.modelId.trim() : '';
    if (loraModelId && UUID_REGEX.test(loraModelId)) allModelIds.add(loraModelId);
  }

  try {
    // Look up checkpoint model name if linking
    let checkpointName: string | null = null;
    if (effectiveCheckpointId) {
      const cpModel = await prisma.userUploadedModel.findUnique({
        where: { id: effectiveCheckpointId },
        select: { name: true },
      });
      checkpointName = cpModel?.name ?? null;
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // Prepare LoRA data
    const normalizedLoras = loras
      .filter((lora) => {
        const loraName = typeof lora.name === 'string' ? lora.name.trim() : '';
        return loraName.length > 0;
      })
      .map((lora) => ({
        modelId: typeof lora.modelId === 'string' && UUID_REGEX.test(lora.modelId.trim()) ? lora.modelId.trim() : null,
        name: (lora.name as string).trim(),
        version: typeof lora.version === 'string' ? lora.version.trim() || null : null,
        weight: typeof lora.weight === 'number' ? lora.weight : null,
      }));

    const unresolvedLoraNames = normalizedLoras
      .filter((lora) => !lora.modelId)
      .map((lora) => lora.name);

    const loraModelsByName = new Map<string, string>();
    if (unresolvedLoraNames.length > 0) {
      const loraModels = await prisma.userUploadedModel.findMany({
        where: { modelType: 'LORA', name: { in: unresolvedLoraNames, mode: 'insensitive' } },
        select: { id: true, name: true },
      });
      for (const model of loraModels) {
        loraModelsByName.set(model.name.toLowerCase(), model.id);
      }
    }

    const loraData = normalizedLoras.map((lora) => ({
      ...lora,
      modelId: lora.modelId ?? loraModelsByName.get(lora.name.toLowerCase()) ?? null,
    }));

    for (const lora of loraData) {
      if (lora.modelId) allModelIds.add(lora.modelId);
    }

    // Detect real image dimensions
    const dims = await fetchImageDimensions(imageUrl);
    const imgWidth = dims?.width ?? 512;
    const imgHeight = dims?.height ?? 512;

    // Create ONE feed item and link it to ALL models via CommunityFeedCheckpointModel rows.
    const result = await prisma.$transaction(async (tx) => {
      // Create ONE MediaAsset
      const asset = await tx.mediaAsset.create({
        data: {
          type: 'IMAGE',
          r2Key: imageUrl,
          width: imgWidth,
          height: imgHeight,
          mimeType: 'image/jpeg',
        },
      });

      // Create ONE CommunityFeedItem with generation metadata
      const feedItem = await tx.communityFeedItem.create({
        data: {
          userId,
          assetId: asset.id,
          caption,
          prompt,
          negativePrompt,
          seed,
          sampler,
          checkpointName,
        },
      });

      // Link to ALL models (managed model, checkpoint, and LoRA models)
      for (const linkedModelId of allModelIds) {
        await tx.communityFeedCheckpointModel.create({
          data: {
            itemId: feedItem.id,
            modelId: linkedModelId,
          },
        });
      }

      // Create LoRA records with modelId for navigation
      for (const ld of loraData) {
        await tx.communityFeedItemLora.create({
          data: {
            itemId: feedItem.id,
            modelId: ld.modelId,
            name: ld.name,
            version: ld.version,
            weight: ld.weight,
          },
        });
      }

      return { feedItem, asset };
    });

    return NextResponse.json({
      success: true,
      item: {
        id: result.feedItem.id,
        assetId: result.asset.id,
        imageUrl,
        linkedModelIds: Array.from(allModelIds),
        caption,
        prompt,
        seed,
        sampler,
      },
    }, { status: 201 });
  } catch (err) {
    console.error('[Admin Gallery POST] Error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/gallery
 *
 * Remove a community feed item (and its checkpoint model link).
 *
 * Body:
 * - itemId: string (required) - the community feed item ID to remove
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

  const itemId = typeof body.itemId === 'string' ? body.itemId.trim() : '';
  if (!UUID_REGEX.test(itemId)) {
    return NextResponse.json({ error: 'Valid itemId is required.' }, { status: 400 });
  }

  const item = await prisma.communityFeedItem.findUnique({
    where: { id: itemId },
    select: { id: true, assetId: true },
  });

  if (!item) {
    return NextResponse.json({ error: 'Item not found.' }, { status: 404 });
  }

  // Delete the feed item (cascades to checkpoint model link and loras)
  await prisma.communityFeedItem.delete({ where: { id: itemId } });

  return NextResponse.json({ success: true, deletedId: itemId });
}
