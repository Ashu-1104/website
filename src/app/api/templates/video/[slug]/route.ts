import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * GET /api/templates/video/[slug]
 *
 * Fetch a single video template by slug or ID.
 */
export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';

  // Find by slug or ID
  const template = await prisma.videoTemplate.findFirst({
    where: {
      OR: [
        { slug },
        ...(UUID_REGEX.test(slug) ? [{ id: slug }] : []),
      ],
      isActive: true,
    },
  });

  if (!template) {
    return NextResponse.json(
      { error: 'Template not found.' },
      { status: 404 }
    );
  }

  // Check if user has favorited/liked
  let isFavorited = false;
  let isLiked = false;

  if (UUID_REGEX.test(userId)) {
    const [favorite, like] = await Promise.all([
      prisma.favorite.findFirst({
        where: { userId, videoTemplateId: template.id, type: 'VIDEO_TEMPLATE' },
      }),
      prisma.like.findFirst({
        where: { userId, videoTemplateId: template.id, type: 'VIDEO_TEMPLATE' },
      }),
    ]);
    isFavorited = !!favorite;
    isLiked = !!like;
  }

  return NextResponse.json({
    template: {
      id: template.id,
      slug: template.slug,
      name: template.name,
      description: template.description,
      thumbnailUrl: template.thumbnailUrl,
      previewVideoUrl: template.previewVideoUrl,
      prompt: template.prompt,
      category: template.category,
      videoGenerationType: template.videoGenerationType,
      creditCost: template.creditCost,
      isNsfw: template.isNsfw,
      likeCount: template.likeCount,
      favoriteCount: template.favoriteCount,
      usageCount: template.usageCount,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      isFavorited,
      isLiked,
    },
  });
}
