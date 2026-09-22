export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const revalidate = 3600; // 1 hour — AI apps list rarely changes

/**
 * GET /api/apps
 *
 * Fetch AI apps/tools list.
 *
 * Query params:
 * - category: Filter by category
 * - featured: Only show featured apps (true/false)
 * - includeNsfw: Include NSFW apps (default: false)
 * - limit: Number of items (default: 50)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const featured = searchParams.get('featured');
  const includeNsfw = searchParams.get('includeNsfw') === 'true';
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

  const where: Record<string, unknown> = {
    isActive: true,
  };

  if (category) {
    where.category = category;
  }

  if (featured === 'true') {
    where.isFeatured = true;
  }

  if (!includeNsfw) {
    where.isNsfw = false;
  }

  const apps = await prisma.aIApp.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    take: limit,
  });

  const items = apps.map((app) => ({
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
    likeCount: app.likeCount,
    favoriteCount: app.favoriteCount,
    usageCount: app.usageCount,
  }));

  return NextResponse.json({ items });
}
