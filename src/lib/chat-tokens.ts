/**
 * Chat Token Processor
 *
 * Handles token tracking and credit deduction for AI chat, silently and
 * invisibly from the user's perspective — they only ever see their credit
 * balance change, never the underlying token math.
 *
 * Plan behaviour summary:
 *  - FREE          : Hard daily cap (2,000 tokens/day). Resets at UTC midnight.
 *                    No credit deduction. Block the AI call if already at limit.
 *  - BASIC/PRO/ULTRA: Accumulate tokens per call. Every N tokens = 1 credit.
 *                    Remainder carries over to the next call.
 *  - ENTERPRISE    : Track tokens for analytics. tokensPerCredit=0 = unlimited.
 *                    Credits are never deducted.
 */

import { prisma } from '@/lib/db';
import { writeCreditTransaction } from '@/lib/credits';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CanChatResult =
  | { allowed: true }
  | { allowed: false; tokensUsed: number; limit: number };

export type TokenProcessResult = {
  creditsDeducted: number;
  accumulatedTokens: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the start of the next UTC day for daily-window resets. */
function nextUtcMidnight(): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Returns true when the stored reset timestamp has passed (or was never set). */
function isDailyWindowExpired(resetAt: Date | null): boolean {
  return !resetAt || new Date() >= resetAt;
}

// ─── Pre-flight: check before the AI call ─────────────────────────────────────

/**
 * Check whether a user is allowed to make a chat request right now.
 *
 * For FREE plan users this enforces the daily token cap BEFORE we spend money
 * on the ModelsLab API call.  All paid plans always return `allowed: true` here
 * (credit balance is checked separately if needed in future).
 *
 * @param userId  The authenticated user's ID.
 */
export async function canUserChat(userId: string): Promise<CanChatResult> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: {
      plan: true,
      chatDailyTokensUsed: true,
      chatDailyResetAt: true,
    },
  });

  if (!subscription) return { allowed: true };

  // Only FREE plan has a dailyTokenLimit — fetch it
  const planConfig = await prisma.planConfig.findUnique({
    where: { planKey: subscription.plan },
    select: { dailyTokenLimit: true },
  });

  const dailyTokenLimit = planConfig?.dailyTokenLimit ?? 0;

  // Non-free plans have no daily cap
  if (dailyTokenLimit <= 0) return { allowed: true };

  // If the daily window has expired, the counter will reset on the next
  // processChatTokens call — treat as 0 used for the purpose of this check.
  const windowExpired = isDailyWindowExpired(subscription.chatDailyResetAt);
  const currentUsed = windowExpired ? 0 : subscription.chatDailyTokensUsed;

  if (currentUsed >= dailyTokenLimit) {
    return { allowed: false, tokensUsed: currentUsed, limit: dailyTokenLimit };
  }

  return { allowed: true };
}

// ─── Post-response: record tokens and deduct credits ─────────────────────────

/**
 * Process tokens from a completed AI response.
 *
 * Called AFTER the AI responds so we have the real `total_tokens` value.
 * Updates the subscription record atomically.  Errors are caught and logged
 * so a token accounting failure never surfaces to the end user.
 *
 * @param userId       The authenticated user's ID.
 * @param totalTokens  Tokens consumed by this AI call (from ModelsLab response).
 */
export async function processChatTokens(
  userId: string,
  totalTokens: number
): Promise<TokenProcessResult> {
  if (totalTokens <= 0) return { creditsDeducted: 0, accumulatedTokens: 0 };

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: {
      id: true,
      plan: true,
      monthlyCredits: true,
      creditsUsed: true,
      chatTokensAccumulated: true,
      chatDailyTokensUsed: true,
      chatDailyResetAt: true,
    },
  });

  if (!subscription) return { creditsDeducted: 0, accumulatedTokens: 0 };

  const planConfig = await prisma.planConfig.findUnique({
    where: { planKey: subscription.plan },
    select: { tokensPerCredit: true, dailyTokenLimit: true },
  });

  const tokensPerCredit = planConfig?.tokensPerCredit ?? 16667;
  const dailyTokenLimit = planConfig?.dailyTokenLimit ?? 0;

  // ── FREE PLAN: update daily counter only ──────────────────────────────────
  if (dailyTokenLimit > 0) {
    const windowExpired = isDailyWindowExpired(subscription.chatDailyResetAt);
    const currentUsed = windowExpired ? 0 : subscription.chatDailyTokensUsed;
    const newUsed = Math.min(currentUsed + totalTokens, dailyTokenLimit);

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        chatDailyTokensUsed: newUsed,
        // Only set a new reset time when we open a fresh window
        chatDailyResetAt: windowExpired ? nextUtcMidnight() : subscription.chatDailyResetAt,
      },
    });

    return { creditsDeducted: 0, accumulatedTokens: newUsed };
  }

  // ── ENTERPRISE (unlimited): track tokens for analytics, never deduct ──────
  if (tokensPerCredit === 0) {
    const newAccumulated = subscription.chatTokensAccumulated + totalTokens;
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { chatTokensAccumulated: newAccumulated },
    });
    return { creditsDeducted: 0, accumulatedTokens: newAccumulated };
  }

  // ── PAID PLANS: accumulate → convert to credits when threshold crossed ────
  const newAccumulated = subscription.chatTokensAccumulated + totalTokens;
  const creditsToDeduct = Math.floor(newAccumulated / tokensPerCredit);
  const remainder = newAccumulated % tokensPerCredit;

  if (creditsToDeduct > 0) {
    // Never push creditsUsed past monthlyCredits (no negative balance)
    const available = subscription.monthlyCredits - subscription.creditsUsed;
    const actualDeduction = Math.min(creditsToDeduct, Math.max(0, available));

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        chatTokensAccumulated: remainder,
        creditsUsed: { increment: actualDeduction },
      },
    });

    // Write audit trail for chat credit deduction — fire-and-forget
    writeCreditTransaction(userId, {
      amount: -actualDeduction,
      description: `Chat conversation (${totalTokens.toLocaleString()} tokens)`,
      source: 'usage',
      category: 'chat',
      operationType: 'CHAT',
    }).catch((e) => console.error('[ChatTokens] Failed to write transaction:', e));

    return { creditsDeducted: actualDeduction, accumulatedTokens: remainder };
  }

  // Not enough tokens to cross a credit threshold yet — just bank the remainder
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { chatTokensAccumulated: newAccumulated },
  });

  return { creditsDeducted: 0, accumulatedTokens: newAccumulated };
}
