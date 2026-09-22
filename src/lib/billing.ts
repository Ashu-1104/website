import { prisma } from '@/lib/db';
import { writeCreditTransaction } from '@/lib/credits';
import type { SubscriptionPlan } from '@prisma/client';

/**
 * Apply credit rollover when a billing period resets.
 *
 * Logic:
 *  - unusedCredits = monthlyCredits - creditsUsed
 *  - rolloverAmount = min(unusedCredits, planConfig.creditRollover)
 *  - new monthlyCredits = planConfig.monthlyCredits + rolloverAmount
 *  - creditsUsed and chatTokensAccumulated reset to 0
 *
 * Plans without a creditRollover (FREE, BASIC) just reset usage to 0.
 * Call this from the payment gateway webhook when a subscription period renews.
 */
export async function applyRolloverCredits(userId: string): Promise<void> {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { plan: true, monthlyCredits: true, creditsUsed: true },
  });
  if (!sub) return;

  const planConfig = await prisma.planConfig.findUnique({
    where: { planKey: sub.plan },
    select: { monthlyCredits: true, creditRollover: true },
  });
  if (!planConfig) return;

  const unusedCredits = Math.max(0, sub.monthlyCredits - sub.creditsUsed);
  const rolloverAmount = planConfig.creditRollover > 0
    ? Math.min(unusedCredits, planConfig.creditRollover)
    : 0;

  await prisma.subscription.update({
    where: { userId },
    data: {
      monthlyCredits: planConfig.monthlyCredits + rolloverAmount,
      creditsUsed: 0,
      chatTokensAccumulated: 0,
    },
  });

  // Write audit transactions — base monthly reset + rollover (if any)
  const txs: Promise<void>[] = [
    writeCreditTransaction(userId, {
      amount: planConfig.monthlyCredits,
      description: 'Monthly subscription credits',
      source: 'subscription',
      category: 'other',
    }),
  ];
  if (rolloverAmount > 0) {
    txs.push(
      writeCreditTransaction(userId, {
        amount: rolloverAmount,
        description: `Credit rollover (${rolloverAmount} unused credits carried over)`,
        source: 'subscription',
        category: 'other',
      }),
    );
  }
  await Promise.all(txs).catch((e) => console.error('[Billing] Failed to write rollover transactions:', e));
}

/**
 * Cap a user's creditsUsed when they downgrade to a cheaper plan.
 *
 * If the user has used more credits than the new plan allows,
 * their creditsUsed is capped at the new plan's monthlyCredits
 * (so they appear at 0 available rather than a negative balance).
 *
 * Also sets monthlyCredits to the new plan's value.
 * Call this when processing a plan downgrade.
 */
export async function capCreditsOnDowngrade(
  userId: string,
  newPlanKey: SubscriptionPlan,
): Promise<void> {
  const [sub, planConfig] = await Promise.all([
    prisma.subscription.findUnique({
      where: { userId },
      select: { creditsUsed: true },
    }),
    prisma.planConfig.findUnique({
      where: { planKey: newPlanKey },
      select: { monthlyCredits: true },
    }),
  ]);

  if (!sub || !planConfig) return;

  const cappedCreditsUsed = Math.min(sub.creditsUsed, planConfig.monthlyCredits);

  await prisma.subscription.update({
    where: { userId },
    data: {
      plan: newPlanKey,
      monthlyCredits: planConfig.monthlyCredits,
      creditsUsed: cappedCreditsUsed,
    },
  });
}
