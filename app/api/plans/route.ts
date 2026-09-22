import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/plans
 *
 * Public endpoint — returns all active plans and credit costs.
 * Used by the subscription page to render pricing dynamically.
 */
export async function GET() {
  try {
    const [plans, creditCosts] = await Promise.all([
      prisma.planConfig.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.creditCost.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    return NextResponse.json({ plans, creditCosts });
  } catch (error) {
    console.error('Failed to load plans:', error);
    return NextResponse.json({ error: 'Failed to load plans' }, { status: 500 });
  }
}
