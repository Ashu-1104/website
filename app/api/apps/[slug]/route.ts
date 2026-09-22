import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * GET /api/apps/[slug]
 *
 * Fetch a single AI app by slug or ID.
 */
export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';

  // Find by slug or ID
  const app = await prisma.aIApp.findFirst({
    where: {
      OR: [
        { slug },
        ...(UUID_REGEX.test(slug) ? [{ id: slug }] : []),
      ],
      isActive: true,
    },
  });

  if (!app) {
    return NextResponse.json(
      { error: 'App not found.' },
      { status: 404 }
    );
  }

  // Check if user has favorited/liked
  let isFavorited = false;
  let isLiked = false;

  if (UUID_REGEX.test(userId)) {
    const [favorite, like] = await Promise.all([
      prisma.favorite.findFirst({
        where: { userId, aiAppId: app.id, type: 'AI_APP' },
      }),
      prisma.like.findFirst({
        where: { userId, aiAppId: app.id, type: 'AI_APP' },
      }),
    ]);
    isFavorited = !!favorite;
    isLiked = !!like;
  }

  return NextResponse.json({
    app: {
      id: app.id,
      slug: app.slug,
      label: app.label,
      description: app.description,
      longDescription: app.longDescription,
      thumbnailUrl: app.thumbnailUrl,
      bannerUrl: app.bannerUrl,
      category: app.category,
      creditCost: app.creditCost,
      isNsfw: app.isNsfw,
      isFeatured: app.isFeatured,
      config: app.config,
      likeCount: app.likeCount,
      favoriteCount: app.favoriteCount,
      usageCount: app.usageCount,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      isFavorited,
      isLiked,
    },
  });
}
