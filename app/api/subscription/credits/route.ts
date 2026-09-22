import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * GET /api/subscription/credits
 *
 * Get the user's current credit balance.
 *
 * Headers:
 * - x-vp-user-id: Required.
 */
export async function GET(request: Request) {
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';

  if (!UUID_REGEX.test(userId)) {
    return NextResponse.json(
      { error: 'Unauthorized. Missing or invalid x-vp-user-id header.' },
      { status: 401 }
    );
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: {
      plan: true,
      status: true,
      monthlyCredits: true,
      creditsUsed: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
    },
  });

  if (!subscription) {
    // Return free tier defaults from DB config
    let freeCredits = 30;
    try {
      const config = await prisma.planConfig.findUnique({ where: { planKey: 'FREE' } });
      if (config) freeCredits = config.monthlyCredits;
    } catch { /* use fallback */ }

    return NextResponse.json({
      credits: {
        plan: 'FREE',
        total: freeCredits,
        used: 0,
        remaining: freeCredits,
        periodStart: null,
        periodEnd: null,
      },
    });
  }

  return NextResponse.json({
    credits: {
      plan: subscription.plan,
      total: subscription.monthlyCredits,
      used: subscription.creditsUsed,
      remaining: subscription.monthlyCredits - subscription.creditsUsed,
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
    },
  });
}

/**
 * POST /api/subscription/credits
 *
 * Use credits for an operation. Returns error if insufficient credits.
 *
 * Headers:
 * - x-vp-user-id: Required.
 *
 * Body:
 * - amount: Number of credits to use (required, positive integer)
 * - operation: Description of what the credits are for (optional)
 */
export async function POST(request: Request) {
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';

  if (!UUID_REGEX.test(userId)) {
    return NextResponse.json(
      { error: 'Unauthorized. Missing or invalid x-vp-user-id header.' },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const amount = typeof body.amount === 'number' ? Math.floor(body.amount) : 0;

  if (amount <= 0) {
    return NextResponse.json(
      { error: 'Amount must be a positive integer.' },
      { status: 400 }
    );
  }

  // Get or create subscription
  let subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    // Create free subscription if none exists
    let freeCredits = 30;
    try {
      const config = await prisma.planConfig.findUnique({ where: { planKey: 'FREE' } });
      if (config) freeCredits = config.monthlyCredits;
    } catch { /* use fallback */ }

    subscription = await prisma.subscription.create({
      data: {
        userId,
        plan: 'FREE',
        status: 'ACTIVE',
        monthlyCredits: freeCredits,
        creditsUsed: 0,
      },
    });
  }

  // Check if subscription is active
  if (subscription.status !== 'ACTIVE' && subscription.status !== 'TRIALING') {
    return NextResponse.json(
      { error: 'Subscription is not active. Please renew your subscription.' },
      { status: 403 }
    );
  }

  // Check credit balance
  const available = subscription.monthlyCredits - subscription.creditsUsed;

  if (amount > available) {
    return NextResponse.json(
      {
        error: 'Insufficient credits.',
        required: amount,
        available,
        plan: subscription.plan,
      },
      { status: 402 } // Payment Required
    );
  }

  // Deduct credits
  const updated = await prisma.subscription.update({
    where: { userId },
    data: {
      creditsUsed: { increment: amount },
    },
  });

  return NextResponse.json({
    success: true,
    credits: {
      used: amount,
      total: updated.monthlyCredits,
      totalUsed: updated.creditsUsed,
      remaining: updated.monthlyCredits - updated.creditsUsed,
    },
  });
}

/**
 * PUT /api/subscription/credits
 *
 * Add bonus credits to user's account (admin operation or promotional).
 *
 * Headers:
 * - x-vp-user-id: Required.
 *
 * Body:
 * - amount: Number of credits to add (required, positive integer)
 * - reason: Reason for adding credits (optional)
 */
export async function PUT(request: Request) {
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';

  if (!UUID_REGEX.test(userId)) {
    return NextResponse.json(
      { error: 'Unauthorized. Missing or invalid x-vp-user-id header.' },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const amount = typeof body.amount === 'number' ? Math.floor(body.amount) : 0;

  if (amount <= 0) {
    return NextResponse.json(
      { error: 'Amount must be a positive integer.' },
      { status: 400 }
    );
  }

  // Get or create subscription
  let subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    let freeCredits = 30;
    try {
      const config = await prisma.planConfig.findUnique({ where: { planKey: 'FREE' } });
      if (config) freeCredits = config.monthlyCredits;
    } catch { /* use fallback */ }

    subscription = await prisma.subscription.create({
      data: {
        userId,
        plan: 'FREE',
        status: 'ACTIVE',
        monthlyCredits: freeCredits + amount, // Add bonus to base
        creditsUsed: 0,
      },
    });

    return NextResponse.json({
      success: true,
      credits: {
        added: amount,
        total: subscription.monthlyCredits,
        used: subscription.creditsUsed,
        remaining: subscription.monthlyCredits - subscription.creditsUsed,
      },
    });
  }

  // Add bonus credits by increasing the monthly limit
  const updated = await prisma.subscription.update({
    where: { userId },
    data: {
      monthlyCredits: { increment: amount },
    },
  });

  return NextResponse.json({
    success: true,
    credits: {
      added: amount,
      total: updated.monthlyCredits,
      used: updated.creditsUsed,
      remaining: updated.monthlyCredits - updated.creditsUsed,
    },
  });
}
