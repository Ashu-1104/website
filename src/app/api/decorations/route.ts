export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const revalidate = 3600; // 1 hour — decorations rarely change

/**
 * GET /api/decorations
 *
 * Fetch profile decorations (avatar frames, glows, banners, etc.).
 *
 * Query params:
 * - type: Filter by type (AVATAR_FRAME, AVATAR_GLOW, AVATAR_EFFECT, BANNER)
 * - premium: Filter by premium status (true/false/all)
 * - limit: Number of items (default: 50)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const premium = searchParams.get('premium');
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

  const validTypes = ['AVATAR_FRAME', 'AVATAR_GLOW', 'AVATAR_EFFECT', 'BANNER'];

  const where: Record<string, unknown> = {
    isActive: true,
  };

  if (type && validTypes.includes(type)) {
    where.type = type;
  }

  if (premium === 'true') {
    where.isPremium = true;
  } else if (premium === 'false') {
    where.isPremium = false;
  }

  const decorations = await prisma.decoration.findMany({
    where,
    orderBy: [{ isPremium: 'asc' }, { name: 'asc' }],
    take: limit,
  });

  const items = decorations.map((decoration) => ({
    id: decoration.id,
    name: decoration.name,
    description: decoration.description,
    type: decoration.type,
    imageUrl: decoration.imageUrl,
    cssClass: decoration.cssClass,
    isPremium: decoration.isPremium,
    price: decoration.price,
  }));

  return NextResponse.json({ items });
}
