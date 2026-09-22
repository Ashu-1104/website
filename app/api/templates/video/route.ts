export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const revalidate = 3600; // 1 hour — video templates rarely change

/**
 * GET /api/templates/video
 *
 * Fetch video templates for video generation.
 *
 * Query params:
 * - type: Filter by generation type (IMAGE_TO_VIDEO, TEXT_TO_VIDEO)
 * - category: Filter by category (MOTION, STYLE, EFFECTS, CINEMATIC, etc.)
 * - includeNsfw: Include NSFW templates (default: false)
 * - limit: Number of items (default: 50)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const category = searchParams.get('category');
  const includeNsfw = searchParams.get('includeNsfw') === 'true';
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

  const validTypes = ['IMAGE_TO_VIDEO', 'TEXT_TO_VIDEO'];
  const validCategories = [
    'TRANSFORMATION', 'ARTISTIC', 'ANIME', 'MOTION', 'EFFECTS',
    'STYLE', 'CINEMATIC', 'SCENE', 'PORTRAIT', 'PRODUCT', 'FANTASY'
  ];

  const where: Record<string, unknown> = {
    isActive: true,
  };

  if (type && validTypes.includes(type)) {
    where.videoGenerationType = type;
  }

  if (category && validCategories.includes(category)) {
    where.category = category;
  }

  if (!includeNsfw) {
    where.isNsfw = false;
  }

  const templates = await prisma.videoTemplate.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    take: limit,
  });

  const items = templates.map((template) => ({
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
  }));

  return NextResponse.json({ items });
}
