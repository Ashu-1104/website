import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const VALID_PLANS = ['FREE', 'BASIC', 'PRO', 'PREMIUM', 'ENTERPRISE'] as const;
const VALID_STATUSES = ['ACTIVE', 'CANCELLED', 'PAST_DUE', 'EXPIRED', 'TRIALING'] as const;

type SubscriptionPlan = (typeof VALID_PLANS)[number];
type SubscriptionStatus = (typeof VALID_STATUSES)[number];

// Fallback credit allocations (used only if PlanConfig not found in DB)
const PLAN_CREDITS_FALLBACK: Record<SubscriptionPlan, number> = {
  FREE: 30,
  BASIC: 300,
  PRO: 1000,
  PREMIUM: 3500,
  ENTERPRISE: 10000,
};

async function getPlanCredits(plan: SubscriptionPlan): Promise<number> {
  try {
    const config = await prisma.planConfig.findUnique({ where: { planKey: plan } });
    if (config) return config.monthlyCredits;
  } catch {
    // Fall through to fallback
  }
  return PLAN_CREDITS_FALLBACK[plan];
}

/**
 * GET /api/subscription
 *
 * Get the current user's subscription details.
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

  let subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  // If no subscription exists, create a free one
  if (!subscription) {
    const freeCredits = await getPlanCredits('FREE');
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

  return NextResponse.json({
    subscription: {
      id: subscription.id,
      plan: subscription.plan,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelledAt: subscription.cancelledAt,
      monthlyCredits: subscription.monthlyCredits,
      creditsUsed: subscription.creditsUsed,
      creditsRemaining: subscription.monthlyCredits - subscription.creditsUsed,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
      // Stripe info is internal, don't expose
    },
  });
}

/**
 * POST /api/subscription
 *
 * Create or initialize a subscription for the user.
 * This is typically called when setting up a new paid subscription.
 *
 * Headers:
 * - x-vp-user-id: Required.
 *
 * Body:
 * - plan: SubscriptionPlan (required)
 * - stripeCustomerId: Stripe customer ID (optional, for paid plans)
 * - stripeSubscriptionId: Stripe subscription ID (optional)
 * - stripePriceId: Stripe price ID (optional)
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

  const plan = body.plan as SubscriptionPlan;

  if (!plan || !VALID_PLANS.includes(plan)) {
    return NextResponse.json(
      { error: `Valid plan is required. Options: ${VALID_PLANS.join(', ')}` },
      { status: 400 }
    );
  }

  // Check if subscription already exists
  const existing = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (existing) {
    return NextResponse.json(
      { error: 'Subscription already exists. Use PUT to update.' },
      { status: 409 }
    );
  }

  const stripeCustomerId = typeof body.stripeCustomerId === 'string' ? body.stripeCustomerId : null;
  const stripeSubscriptionId =
    typeof body.stripeSubscriptionId === 'string' ? body.stripeSubscriptionId : null;
  const stripePriceId = typeof body.stripePriceId === 'string' ? body.stripePriceId : null;

  // Calculate period end (30 days from now for paid plans)
  const currentPeriodEnd = plan !== 'FREE' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null;
  const planCredits = await getPlanCredits(plan);

  const subscription = await prisma.subscription.create({
    data: {
      userId,
      plan,
      status: 'ACTIVE',
      monthlyCredits: planCredits,
      creditsUsed: 0,
      currentPeriodEnd,
      stripeCustomerId,
      stripeSubscriptionId,
      stripePriceId,
    },
  });

  return NextResponse.json(
    {
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        monthlyCredits: subscription.monthlyCredits,
        creditsUsed: subscription.creditsUsed,
        creditsRemaining: subscription.monthlyCredits - subscription.creditsUsed,
        createdAt: subscription.createdAt,
      },
    },
    { status: 201 }
  );
}

/**
 * PUT /api/subscription
 *
 * Update the user's subscription (upgrade, downgrade, or update Stripe info).
 *
 * Headers:
 * - x-vp-user-id: Required.
 *
 * Body (all optional):
 * - plan: New subscription plan
 * - status: New subscription status
 * - stripeCustomerId: Stripe customer ID
 * - stripeSubscriptionId: Stripe subscription ID
 * - stripePriceId: Stripe price ID
 * - resetCredits: If true, reset credits used to 0 (for plan upgrades)
 */
export async function PUT(request: Request) {
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';

  if (!UUID_REGEX.test(userId)) {
    return NextResponse.json(
      { error: 'Unauthorized. Missing or invalid x-vp-user-id header.' },
      { status: 401 }
    );
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    return NextResponse.json(
      { error: 'No subscription found. Use POST to create one.' },
      { status: 404 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};

  // Update plan
  if (body.plan && VALID_PLANS.includes(body.plan as SubscriptionPlan)) {
    const newPlan = body.plan as SubscriptionPlan;
    updateData.plan = newPlan;
    updateData.monthlyCredits = await getPlanCredits(newPlan);

    // Reset period for paid plans
    if (newPlan !== 'FREE') {
      updateData.currentPeriodStart = new Date();
      updateData.currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  }

  // Update status
  if (body.status && VALID_STATUSES.includes(body.status as SubscriptionStatus)) {
    updateData.status = body.status;

    // If cancelling, set cancelled date
    if (body.status === 'CANCELLED') {
      updateData.cancelledAt = new Date();
    }
  }

  // Update Stripe info
  if (typeof body.stripeCustomerId === 'string') {
    updateData.stripeCustomerId = body.stripeCustomerId;
  }

  if (typeof body.stripeSubscriptionId === 'string') {
    updateData.stripeSubscriptionId = body.stripeSubscriptionId;
  }

  if (typeof body.stripePriceId === 'string') {
    updateData.stripePriceId = body.stripePriceId;
  }

  // Reset credits if requested (useful for plan upgrades)
  if (body.resetCredits === true) {
    updateData.creditsUsed = 0;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
  }

  const updated = await prisma.subscription.update({
    where: { userId },
    data: updateData,
  });

  return NextResponse.json({
    subscription: {
      id: updated.id,
      plan: updated.plan,
      status: updated.status,
      currentPeriodStart: updated.currentPeriodStart,
      currentPeriodEnd: updated.currentPeriodEnd,
      cancelledAt: updated.cancelledAt,
      monthlyCredits: updated.monthlyCredits,
      creditsUsed: updated.creditsUsed,
      creditsRemaining: updated.monthlyCredits - updated.creditsUsed,
      updatedAt: updated.updatedAt,
    },
  });
}

/**
 * DELETE /api/subscription
 *
 * Cancel the user's subscription (sets status to CANCELLED).
 * Does not delete the record, just marks it as cancelled.
 *
 * Headers:
 * - x-vp-user-id: Required.
 */
export async function DELETE(request: Request) {
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';

  if (!UUID_REGEX.test(userId)) {
    return NextResponse.json(
      { error: 'Unauthorized. Missing or invalid x-vp-user-id header.' },
      { status: 401 }
    );
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    return NextResponse.json({ error: 'No subscription found.' }, { status: 404 });
  }

  if (subscription.status === 'CANCELLED') {
    return NextResponse.json({ error: 'Subscription is already cancelled.' }, { status: 400 });
  }

  // Downgrade to FREE plan at end of period instead of immediate cancellation
  const updated = await prisma.subscription.update({
    where: { userId },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      // Keep current plan until period ends
    },
  });

  return NextResponse.json({
    message: 'Subscription cancelled successfully.',
    subscription: {
      id: updated.id,
      plan: updated.plan,
      status: updated.status,
      currentPeriodEnd: updated.currentPeriodEnd,
      cancelledAt: updated.cancelledAt,
    },
  });
}
