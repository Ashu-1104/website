import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AuthError, requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * GET /api/admin/plans
 * List all plans and credit costs for admin management
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

  try {
    const [plans, creditCosts] = await Promise.all([
      prisma.planConfig.findMany({
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.creditCost.findMany({
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    return NextResponse.json({ plans, creditCosts });
  } catch (error) {
    console.error('Failed to load plans:', error);
    return NextResponse.json({ error: 'Failed to load plans' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/plans
 * Update a plan config or credit cost
 *
 * Body:
 *  - type: "plan" | "creditCost"
 *  - id: UUID of the record
 *  - ... fields to update
 */
export async function PATCH(request: Request) {
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
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!id || !UUID_REGEX.test(id)) {
    return NextResponse.json({ error: 'Valid ID is required' }, { status: 400 });
  }

  const type = body.type as string;

  try {
    if (type === 'plan') {
      const existing = await prisma.planConfig.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
      }

      const data: Record<string, unknown> = {};

      if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
      if (typeof body.monthlyPrice === 'number') data.monthlyPrice = body.monthlyPrice;
      if (typeof body.annualPrice === 'number') data.annualPrice = body.annualPrice;
      if (typeof body.monthlyCredits === 'number') data.monthlyCredits = Math.floor(body.monthlyCredits);
      if (typeof body.maxCompanions === 'number') data.maxCompanions = Math.floor(body.maxCompanions);
      if (typeof body.creditRollover === 'number') data.creditRollover = Math.floor(body.creditRollover);
      if (typeof body.loraTrainingCredits === 'number') data.loraTrainingCredits = Math.floor(body.loraTrainingCredits);
      if (typeof body.isActive === 'boolean') data.isActive = body.isActive;
      if (typeof body.isRecommended === 'boolean') data.isRecommended = body.isRecommended;
      if (Array.isArray(body.features)) data.features = body.features;

      if (Object.keys(data).length === 0) {
        return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
      }

      const plan = await prisma.planConfig.update({ where: { id }, data });
      return NextResponse.json({ plan });
    }

    if (type === 'creditCost') {
      const existing = await prisma.creditCost.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ error: 'Credit cost not found' }, { status: 404 });
      }

      const data: Record<string, unknown> = {};

      if (typeof body.label === 'string' && body.label.trim()) data.label = body.label.trim();
      if (typeof body.credits === 'number') data.credits = Math.floor(body.credits);
      if (typeof body.description === 'string') data.description = body.description.trim();
      if (typeof body.isActive === 'boolean') data.isActive = body.isActive;

      if (Object.keys(data).length === 0) {
        return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
      }

      const creditCost = await prisma.creditCost.update({ where: { id }, data });
      return NextResponse.json({ creditCost });
    }

    return NextResponse.json({ error: 'type must be "plan" or "creditCost"' }, { status: 400 });
  } catch (error) {
    console.error('Failed to update:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
