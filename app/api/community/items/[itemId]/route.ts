import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ABSOLUTE_URL_REGEX = /^https?:\/\//i;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function withBaseUrl(baseUrl: string, key?: string | null) {
  if (!key) return null;
  if (ABSOLUTE_URL_REGEX.test(key)) return key;
  if (!baseUrl) return null;
  return `${baseUrl}/${key}`;
}

export async function GET(
  request: Request,
  { params }: { params: { itemId: string } }
) {
  const mediaBaseUrl = (process.env.MEDIA_BASE_URL ?? '').replace(/\/+$/, '');
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';

  const item = await prisma.communityFeedItem.findUnique({
    where: { id: params.itemId },
    include: {
      asset: true,
      user: true,
      loras: { include: { model: { select: { id: true, name: true, slug: true, modelType: true, thumbnailUrl: true } } } },
      checkpointModels: { include: { model: { select: { id: true, name: true, slug: true, modelType: true, thumbnailUrl: true } } } },
    },
  });

  if (!item) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const reactionCounts = await prisma.communityFeedReaction.groupBy({
    by: ['emoji'],
    where: { itemId: item.id },
    _count: { emoji: true },
  });

  const myReactions = UUID_REGEX.test(userId)
    ? await prisma.communityFeedReaction.findMany({
        where: { itemId: item.id, userId },
        select: { emoji: true },
      })
    : [];

  const commentsCount = await prisma.communityFeedComment.count({
    where: { itemId: item.id },
  });

  // Build LoRA data with model links.
  // First try the lora's own model relation, then checkpointModels LORA entries, then DB name lookup.
  const loraModelLinksFromCp = new Map<string, { id: string; slug: string | null; thumbnailUrl: string | null }>();
  for (const cm of item.checkpointModels) {
    if (cm.model?.modelType === 'LORA') {
      loraModelLinksFromCp.set(cm.model.name.toLowerCase(), { id: cm.model.id, slug: cm.model.slug, thumbnailUrl: cm.model.thumbnailUrl });
    }
  }

  // For any loras without a modelId, look them up by name in the DB
  const unlinkedLoraNames = item.loras
    .filter((l) => !l.model && !loraModelLinksFromCp.has(l.name.toLowerCase()))
    .map((l) => l.name);

  const loraModelsByName = new Map<string, { id: string; slug: string | null; thumbnailUrl: string | null }>();
  if (unlinkedLoraNames.length > 0) {
    const foundModels = await prisma.userUploadedModel.findMany({
      where: { name: { in: unlinkedLoraNames, mode: 'insensitive' } },
      select: { id: true, name: true, slug: true, thumbnailUrl: true },
    });
    for (const m of foundModels) {
      loraModelsByName.set(m.name.toLowerCase(), { id: m.id, slug: m.slug, thumbnailUrl: m.thumbnailUrl });
    }
  }

  const lorasWithModels = item.loras.map((lora) => {
    let modelSlug = lora.model?.slug ?? null;
    let modelId = lora.model?.id ?? null;
    let modelThumb = lora.model?.thumbnailUrl ?? null;
    if (!modelId) {
      const match = loraModelLinksFromCp.get(lora.name.toLowerCase()) ?? loraModelsByName.get(lora.name.toLowerCase());
      if (match) {
        modelId = match.id;
        modelSlug = match.slug;
        modelThumb = match.thumbnailUrl;
      }
    }
    return {
      id: lora.id,
      name: lora.name,
      version: lora.version,
      weight: lora.weight,
      thumbnailUrl: withBaseUrl(mediaBaseUrl, lora.thumbnailKey) ?? modelThumb,
      modelSlug,
      modelId,
    };
  });

  return NextResponse.json({
    item: {
      id: item.id,
      caption: item.caption,
      createdAt: item.createdAt,
      creator: {
        id: item.user.id,
        handle: item.user.handle,
        avatarUrl: item.user.avatarUrl,
      },
      asset: {
        ...item.asset,
        url: withBaseUrl(mediaBaseUrl, item.asset.r2Key),
        posterUrl: withBaseUrl(mediaBaseUrl, item.asset.posterKey),
        previewUrl: withBaseUrl(mediaBaseUrl, item.asset.previewKey),
      },
      generation: {
        prompt: item.prompt,
        negativePrompt: item.negativePrompt,
        seed: item.seed,
        sampler: item.sampler,
        checkpoint: (() => {
          // Find the actual CHECKPOINT model, not LoRA links
          const cpLink = item.checkpointModels.find((cm) => cm.model?.modelType === 'CHECKPOINT');
          const name = item.checkpointName || cpLink?.model?.name || null;
          if (!name && !cpLink) return null;
          return {
            name: name ?? 'Unknown',
            version: item.checkpointVersion,
            thumbnailUrl: withBaseUrl(mediaBaseUrl, item.checkpointThumbnailKey) ?? cpLink?.model?.thumbnailUrl ?? null,
            modelSlug: cpLink?.model?.slug ?? null,
            modelId: cpLink?.model?.id ?? null,
          };
        })(),
        loras: lorasWithModels,
      },
      reactions: reactionCounts.map((record) => ({
        emoji: record.emoji,
        count: record._count.emoji,
      })),
      myReactions: myReactions.map((reaction) => reaction.emoji),
      commentsCount,
    },
  });
}
