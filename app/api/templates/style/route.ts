export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const revalidate = 300; // 5 minutes — style templates update occasionally

/**
 * GET /api/templates/style
 *
 * Fetch style templates for image-to-image transformation.
 *
 * Query params:
 * - category: Filter by category (TRANSFORMATION, ARTISTIC, ANIME, etc.)
 * - includeNsfw: Include NSFW templates (default: false)
 * - limit: Number of items (default: 50)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const includeNsfw = searchParams.get('includeNsfw') === 'true';
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

  const validCategories = [
    'TRANSFORMATION', 'ARTISTIC', 'ANIME', 'MOTION', 'EFFECTS',
    'STYLE', 'CINEMATIC', 'SCENE', 'PORTRAIT', 'PRODUCT', 'FANTASY'
  ];

  const where: Record<string, unknown> = {
    isActive: true,
  };

  if (category && validCategories.includes(category)) {
    where.category = category;
  }

  if (!includeNsfw) {
    where.isNsfw = false;
  }

  const templates = await prisma.styleTemplate.findMany({
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
    prompt: template.prompt,
    category: template.category,
    creditCost: template.creditCost,
    isNsfw: template.isNsfw,
    likeCount: template.likeCount,
    favoriteCount: template.favoriteCount,
    usageCount: template.usageCount,
  }));

  return NextResponse.json({ items });
}
