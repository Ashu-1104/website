export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const revalidate = 3600; // 1 hour — AI filters rarely change

/**
 * GET /api/ai-filters
 * Public endpoint — returns all active AI filters for the playground.
 */
export async function GET() {
  try {
    const filters = await prisma.styleTemplate.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        thumbnailUrl: true,
        prompt: true,
        description: true,
      },
    });

    return NextResponse.json({ filters });
  } catch (error) {
    console.error('Failed to load AI filters:', error);
    return NextResponse.json({ error: 'Failed to load filters' }, { status: 500 });
  }
}
