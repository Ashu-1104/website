import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type DeductSuccess = { ok: true; creditsDeducted: number };
type DeductFailure = { ok: false; response: ReturnType<typeof NextResponse.json> };
export type DeductResult = DeductSuccess | DeductFailure;

// ─── Category mapping ─────────────────────────────────────────────────────────

const IMAGE_OPS = new Set(['IMAGE_GENERATION', 'IMAGE_EDIT', 'FACE_SWAP', 'LORA_TRAINING']);
const VIDEO_OPS = new Set(['VIDEO_GENERATION', 'DEEPFAKE_VIDEO', 'MOTION_TRANSFER_PER_SECOND']);
const AUDIO_OPS = new Set(['TEXT_TO_SPEECH', 'SOUND_EFFECT', 'VOICE_CLONING', 'VOICE_COVER', 'SONG_GENERATION', 'MUSIC_GENERATION']);

export function categoryForOperation(operationType: string): string {
  if (IMAGE_OPS.has(operationType)) return 'image';
  if (VIDEO_OPS.has(operationType)) return 'video';
  if (AUDIO_OPS.has(operationType)) return 'audio';
  return 'other';
}

// ─── Transaction writer (fire-and-forget safe) ────────────────────────────────

export async function writeCreditTransaction(
  userId: string,
  data: {
    amount: number;
    description: string;
    source: string;
    category: string;
    operationType?: string;
  },
): Promise<void> {
  await prisma.creditTransaction.create({
    data: {
      userId,
      amount: data.amount,
      description: data.description,
      source: data.source,
      category: data.category,
      operationType: data.operationType ?? null,
    },
  });
}

// ─── Subscription helpers ─────────────────────────────────────────────────────

async function getOrCreateSubscription(userId: string) {
  let sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { monthlyCredits: true, creditsUsed: true, status: true, currentPeriodEnd: true },
  });

  if (!sub) {
    let freeCredits = 30;
    try {
      const cfg = await prisma.planConfig.findUnique({ where: { planKey: 'FREE' } });
      if (cfg) freeCredits = cfg.monthlyCredits;
    } catch { /* use fallback */ }
    sub = await prisma.subscription.create({
      data: { userId, plan: 'FREE', status: 'ACTIVE', monthlyCredits: freeCredits, creditsUsed: 0 },
      select: { monthlyCredits: true, creditsUsed: true, status: true, currentPeriodEnd: true },
    });
  }

  return sub;
}

function isSubscriptionActive(sub: { status: string; currentPeriodEnd: Date | null }): boolean {
  if (sub.status === 'ACTIVE' || sub.status === 'TRIALING') return true;
  // Allow CANCELLED subscriptions until the end of the billing period
  if (sub.status === 'CANCELLED' && sub.currentPeriodEnd && sub.currentPeriodEnd > new Date()) return true;
  return false;
}

/** Returns the credit cost for an operation type (from CreditCost table). */
export async function getOperationCreditCost(operationType: string, fallback = 0): Promise<number> {
  const record = await prisma.creditCost.findUnique({
    where: { operationType },
    select: { credits: true, isActive: true },
  });
  return record?.isActive ? record.credits : fallback;
}

// ─── Deduction ────────────────────────────────────────────────────────────────

/**
 * Look up the credit cost for an operation, verify the user has enough credits,
 * atomically deduct them, and write an audit transaction row.
 */
export async function deductCreditsForOperation(
  userId: string,
  operationType: string,
  fallbackCredits = 0,
): Promise<DeductResult> {
  const costRecord = await prisma.creditCost.findUnique({
    where: { operationType },
    select: { credits: true, isActive: true, label: true },
  });

  const credits = costRecord?.isActive ? costRecord.credits : fallbackCredits;
  const label = costRecord?.label ?? operationType;
  const category = categoryForOperation(operationType);

  const result = await deductExactCredits(userId, credits, label, operationType, category);
  return result;
}

/**
 * Deduct an explicit credit amount. Used for combined/dynamic pricing
 * (kissing-video, motion-transfer). Pass operationType so the category
 * is derived correctly for the chart.
 */
export async function deductExactCredits(
  userId: string,
  credits: number,
  label?: string,
  operationType?: string,
  category?: string,
): Promise<DeductResult> {
  if (credits <= 0) return { ok: true, creditsDeducted: 0 };

  const sub = await getOrCreateSubscription(userId);

  if (!isSubscriptionActive(sub)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Subscription is not active.', code: 'SUBSCRIPTION_INACTIVE' },
        { status: 403 },
      ),
    };
  }

  const available = sub.monthlyCredits - sub.creditsUsed;
  if (credits > available) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'Insufficient credits.',
          required: credits,
          available,
          operation: label,
          code: 'INSUFFICIENT_CREDITS',
        },
        { status: 402 },
      ),
    };
  }

  // Atomic deduction — prevents race-condition overspend
  const updated: number = await prisma.$executeRaw`
    UPDATE "Subscription"
    SET "creditsUsed" = "creditsUsed" + ${credits}
    WHERE "userId" = ${userId}::uuid
      AND ("creditsUsed" + ${credits}) <= "monthlyCredits"
  `;

  if (updated === 0) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'Insufficient credits.',
          required: credits,
          available: 0,
          operation: label,
          code: 'INSUFFICIENT_CREDITS',
        },
        { status: 402 },
      ),
    };
  }

  // Write audit trail — fire-and-forget, never blocks the main response
  writeCreditTransaction(userId, {
    amount: -credits,
    description: label ?? operationType ?? 'Unknown operation',
    source: 'usage',
    category: category ?? (operationType ? categoryForOperation(operationType) : 'other'),
    operationType,
  }).catch((e) => console.error('[Credits] Failed to write transaction:', e));

  return { ok: true, creditsDeducted: credits };
}

// ─── Refund ───────────────────────────────────────────────────────────────────

/** Refund credits previously deducted. Safe to call in a catch block. */
export async function refundCredits(userId: string, credits: number): Promise<void> {
  if (credits <= 0) return;
  await prisma.subscription.update({
    where: { userId },
    data: { creditsUsed: { decrement: credits } },
  }).catch((e) => console.error('Failed to refund credits:', e));

  // Write audit trail for the refund
  writeCreditTransaction(userId, {
    amount: credits, // positive = credit back
    description: 'Refund (generation failed)',
    source: 'adjustment',
    category: 'other',
  }).catch((e) => console.error('[Credits] Failed to write refund transaction:', e));
}
