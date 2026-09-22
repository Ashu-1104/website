'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { SidebarProvider } from '@/context/SidebarContext';
import Link from 'next/link';
import { Check, Crown, Flame, Gem, Info, Loader2, PauseCircle, Sparkles, XCircle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ---------- Types ---------- */

interface PlanConfig {
  id: string;
  planKey: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  monthlyCredits: number;
  maxCompanions: number;
  creditRollover: number;
  tokensPerCredit: number;
  dailyTokenLimit: number;
  loraTrainingCredits: number;
  features: string[] | null;
  isActive: boolean;
  isRecommended: boolean;
  sortOrder: number;
}

interface CreditCost {
  id: string;
  operationType: string;
  label: string;
  category: string;
  credits: number;
  description: string | null;
}

type SubscriptionStatus = 'none' | 'trialing' | 'active' | 'paused' | 'cancelled';

type SubscriptionSummary = {
  planId: string | null;
  status: SubscriptionStatus;
  renewsAt: Date | null;
  trialEndsAt: Date | null;
};

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: '2-digit' });

const PLAN_ANNUAL_SAVINGS: Record<string, string> = {
  PRO: 'Save 40%',
  PREMIUM: 'Save 66%',
  ENTERPRISE: 'Save 76%',
};

const PLAN_ICONS: Record<string, React.ElementType> = {
  BASIC: Zap,
  PRO: Flame,
  PREMIUM: Crown,
  ENTERPRISE: Gem,
};

const MOCK_SUBSCRIPTION: SubscriptionSummary = {
  planId: null,
  status: 'none',
  renewsAt: null,
  trialEndsAt: null,
};

const STATUS_BADGE_STYLES: Record<SubscriptionStatus, string> = {
  none: 'bg-white/5 text-text-secondary border-white/10',
  trialing: 'bg-accent-pink/10 text-accent-pink border-accent-pink/20',
  active: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  paused: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  cancelled: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
};

/** Returns a human-readable monthly token budget for the comparison table. */
function formatTokenBudget(monthlyCredits: number, tokensPerCredit: number, dailyTokenLimit: number): string {
  if (dailyTokenLimit > 0) return `${dailyTokenLimit.toLocaleString()} tokens/day`;
  if (tokensPerCredit === 0) return 'Unlimited';
  const total = monthlyCredits * tokensPerCredit;
  if (total >= 1_000_000) return `~${Math.round(total / 1_000_000)}M / mo`;
  if (total >= 1_000) return `~${Math.round(total / 1_000)}K / mo`;
  return `${total.toLocaleString()} / mo`;
}

/**
 * Highlights the leading quantity in a feature string.
 * e.g. "~5M chat tokens/month" → <b>~5M</b> chat tokens/month
 *      "3 AI companions"       → <b>3</b> AI companions
 *      "Unlimited companions"  → <b>Unlimited</b> companions
 * Strings with no leading quantity are returned unchanged.
 */
function highlightFeatureText(text: string): React.ReactNode {
  const match = text.match(/^(~?[\d,.]+[MmKk]?|Unlimited)\s+(.+)$/);
  if (!match) return text;
  return (
    <>
      <span className="font-semibold text-white">{match[1]}</span>{' '}{match[2]}
    </>
  );
}

/**
 * Returns the approximate dollar cost for a given credit amount on a specific plan.
 * Formula: credits × (planMonthlyPrice / planMonthlyCredits)
 */
function calcDollarCost(credits: number, plan: PlanConfig | null): string {
  if (!plan || !plan.monthlyCredits || !plan.monthlyPrice) return '';
  const costPerCredit = plan.monthlyPrice / plan.monthlyCredits;
  const total = credits * costPerCredit;
  if (total < 0.01) return '<$0.01';
  return `~$${total.toFixed(2)}`;
}

export default function SubscriptionPage() {
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [creditCosts, setCreditCosts] = useState<CreditCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [selectedCostPlanKey, setSelectedCostPlanKey] = useState<string>('BASIC');

  const subscription = MOCK_SUBSCRIPTION;

  useEffect(() => {
    let cancelled = false;
    fetch('/api/plans')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setPlans(data.plans ?? []);
          setCreditCosts(data.creditCosts ?? []);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Separate free from paid plans
  const paidPlans = plans.filter((p) => p.planKey !== 'FREE');
  const currentPlan = subscription.planId ? plans.find((p) => p.planKey === subscription.planId) : null;

  const statusLabel =
    subscription.status === 'none'
      ? 'No subscription'
      : subscription.status === 'trialing'
        ? 'Trial'
        : subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1);

  // Group credit costs by category
  const creditCostsByCategory: Record<string, CreditCost[]> = {};
  for (const cost of creditCosts) {
    if (!creditCostsByCategory[cost.category]) creditCostsByCategory[cost.category] = [];
    creditCostsByCategory[cost.category].push(cost);
  }

  return (
    <SidebarProvider>
      <div className="app-layout">
        <Sidebar />
        <Header />
        <main className="main-content">
          <div className="content-wrapper">
            <h1 className="page-title">Subscription</h1>
            <p className="mt-2 text-text-secondary">Manage your plan, feature access, and monthly credit bonuses.</p>

            {loading ? (
              <div className="mt-12 flex items-center justify-center gap-2 text-text-secondary">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading plans...
              </div>
            ) : (
              <>
                {/* ---- Current Plan Summary ---- */}
                <section className="mt-8 grid gap-6 lg:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-background-secondary p-5 shadow-card lg:col-span-2">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Crown className="h-5 w-5 text-accent-pink" aria-hidden="true" />
                          <h2 className="text-lg font-semibold text-white">Current plan</h2>
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold',
                              STATUS_BADGE_STYLES[subscription.status]
                            )}
                          >
                            {statusLabel}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-text-secondary">
                          {currentPlan ? (
                            <>
                              You&apos;re on <span className="font-semibold text-white">{currentPlan.name}</span>.
                            </>
                          ) : (
                            <>
                              You&apos;re currently on the <span className="font-semibold text-white">Free</span> plan.
                            </>
                          )}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href="/billing"
                          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10"
                        >
                          Billing &amp; payment methods
                        </Link>
                        <button
                          type="button"
                          className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                          disabled
                          title="Checkout coming soon"
                        >
                          <Sparkles className="h-4 w-4" aria-hidden="true" />
                          Manage subscription
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="text-xs font-semibold text-text-muted">Tier</div>
                        <div className="mt-1 text-base font-semibold text-white">{currentPlan?.name ?? 'Free'}</div>
                        <div className="mt-1 text-sm text-text-secondary">
                          {currentPlan ? `$${currentPlan.monthlyPrice}/mo` : 'Free plan'}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="text-xs font-semibold text-text-muted">Renews</div>
                        <div className="mt-1 text-base font-semibold text-white">
                          {subscription.renewsAt ? DATE_FORMATTER.format(subscription.renewsAt) : '—'}
                        </div>
                        <div className="mt-1 text-sm text-text-secondary">Auto-renewal status shown here</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="text-xs font-semibold text-text-muted">Monthly credits</div>
                        <div className="mt-1 text-base font-semibold text-white">
                          {currentPlan ? `${currentPlan.monthlyCredits.toLocaleString()} credits/mo` : '30 credits/mo'}
                        </div>
                        <div className="mt-1 text-sm text-text-secondary">Bonus credits added each month</div>
                      </div>
                    </div>

                    <div className="mt-5 flex items-start gap-3 rounded-2xl border border-white/10 bg-gradient-to-r from-accent-pink/10 via-purple-500/10 to-transparent p-4">
                      <Info className="mt-0.5 h-4 w-4 text-accent-pink" aria-hidden="true" />
                      <div className="text-sm text-text-secondary">
                        Plan changes are prorated: you only pay the difference for the remaining billing period.
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-background-secondary p-5 shadow-card">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-accent-pink" aria-hidden="true" />
                      <h2 className="text-lg font-semibold text-white">Trial status</h2>
                    </div>
                    <p className="mt-1 text-sm text-text-secondary">If you&apos;re in a trial, details show here.</p>

                    <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs font-semibold text-text-muted">Days remaining</div>
                      <div className="mt-1 text-3xl font-semibold text-white">
                        {subscription.status === 'trialing' && subscription.trialEndsAt
                          ? Math.max(0, Math.ceil((subscription.trialEndsAt.getTime() - Date.now()) / 86_400_000))
                          : '—'}
                      </div>
                      <div className="mt-2 text-sm text-text-secondary">
                        {subscription.status === 'trialing' && subscription.trialEndsAt
                          ? `Ends on ${DATE_FORMATTER.format(subscription.trialEndsAt)}`
                          : 'No active trial'}
                      </div>
                    </div>
                  </div>
                </section>

                {/* ---- Billing Cycle Toggle ---- */}
                <section className="mt-10">
                  <div className="section-header">
                    <h2 className="section-title">Plans</h2>
                  </div>
                  <div className="mt-4 mb-4 flex justify-center">
                    <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
                      <button
                        type="button"
                        className={cn(
                          'rounded-lg px-4 py-1.5 text-sm font-semibold transition',
                          billingCycle === 'monthly'
                            ? 'bg-accent-pink text-white'
                            : 'text-white/60 hover:text-white'
                        )}
                        onClick={() => setBillingCycle('monthly')}
                      >
                        Monthly
                      </button>
                      <button
                        type="button"
                        className={cn(
                          'rounded-lg px-4 py-1.5 text-sm font-semibold transition',
                          billingCycle === 'annual'
                            ? 'bg-accent-pink text-white'
                            : 'text-white/60 hover:text-white'
                        )}
                        onClick={() => setBillingCycle('annual')}
                      >
                        Annual
                        <span className="ml-1.5 text-xs text-emerald-400">Save up to 76%</span>
                      </button>
                    </div>
                  </div>

                  {/* ---- Plan Cards ---- */}
                  <div className="grid gap-6 lg:grid-cols-4">
                    {paidPlans.map((plan) => {
                      const price = billingCycle === 'annual' && plan.annualPrice > 0
                        ? plan.annualPrice
                        : plan.monthlyPrice;
                      const isCurrent = currentPlan?.planKey === plan.planKey;
                      const savings = plan.monthlyPrice > 0 && plan.annualPrice > 0
                        ? Math.round((1 - plan.annualPrice / plan.monthlyPrice) * 100)
                        : 0;

                      return (
                        <div
                          key={plan.id}
                          className={cn(
                            'relative flex flex-col rounded-2xl border border-white/10 bg-background-secondary p-5 shadow-card',
                            plan.isRecommended && 'border-accent-pink/30 bg-gradient-to-br from-accent-pink/10 via-background-secondary to-background-secondary'
                          )}
                        >
                          {plan.isRecommended ? (
                            <div className="absolute right-5 top-5 rounded-full border border-accent-pink/20 bg-accent-pink/10 px-3 py-1 text-xs font-semibold text-accent-pink">
                              Recommended
                            </div>
                          ) : null}

                          <div className="flex items-center gap-2 flex-wrap">
                            {React.createElement(PLAN_ICONS[plan.planKey] ?? Crown, { className: 'h-5 w-5 text-accent-pink', 'aria-hidden': 'true' })}
                            <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                            {PLAN_ANNUAL_SAVINGS[plan.planKey] && (
                              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                                {PLAN_ANNUAL_SAVINGS[plan.planKey]}
                              </span>
                            )}
                          </div>

                          <div className="mt-2">
                            <span className="text-3xl font-semibold text-white">${price.toFixed(2)}</span>
                            <span className="text-sm text-text-secondary">/mo</span>
                          </div>

                          {billingCycle === 'annual' && savings > 0 && (
                            <div className="mt-1 text-xs text-emerald-400 font-medium">
                              Save {savings}% vs monthly
                            </div>
                          )}

                          <div className="mt-2 text-sm text-text-secondary">
                            Includes <span className="font-semibold text-white">{plan.monthlyCredits.toLocaleString()} credits</span> every month.
                          </div>

                          <ul className="mt-4 mb-6 space-y-2 text-sm text-text-secondary">
                            {Array.isArray(plan.features) && plan.features.map((feature) => (
                              <li key={feature} className="flex items-start gap-2">
                                <Check className="mt-0.5 h-4 w-4 text-emerald-400 flex-shrink-0" aria-hidden="true" />
                                <span>{highlightFeatureText(feature)}</span>
                              </li>
                            ))}
                          </ul>

                          <button
                            type="button"
                            className="btn-primary mt-auto w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
                            disabled
                            title="Checkout coming soon"
                            aria-disabled
                          >
                            {isCurrent ? 'Current plan' : `Choose ${plan.name}`}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* ---- Credit Costs ---- */}
                <section className="mt-10 rounded-2xl border border-white/10 bg-background-secondary p-5 shadow-card">
                  {/* Header row: title left, plan filter right */}
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Crown className="h-5 w-5 text-accent-pink" aria-hidden="true" />
                        <h2 className="text-lg font-semibold text-white">Credit costs per generation</h2>
                      </div>
                      <p className="mt-1 text-sm text-text-secondary">
                        Every generation deducts credits from your monthly allowance. Select a plan to see the dollar equivalent.
                      </p>
                    </div>

                    {/* Plan filter tabs */}
                    <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
                      {paidPlans.map((plan) => (
                        <button
                          key={plan.planKey}
                          type="button"
                          onClick={() => setSelectedCostPlanKey(plan.planKey)}
                          className={cn(
                            'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                            selectedCostPlanKey === plan.planKey
                              ? 'bg-accent-pink text-white'
                              : 'text-white/50 hover:text-white'
                          )}
                        >
                          {plan.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cost cards */}
                  {(() => {
                    const activePlan = paidPlans.find((p) => p.planKey === selectedCostPlanKey) ?? paidPlans[0] ?? null;
                    return (
                      <>
                        {/* Column labels */}
                        <div className="mt-5 mb-2 grid grid-cols-[1fr_auto_auto] gap-3 px-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
                          <span>Tool</span>
                          <span>Credits</span>
                          <span className="w-16 text-right">Est. cost</span>
                        </div>

                        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                          {Object.entries(creditCostsByCategory).map(([category, costs]) => (
                            <div key={category} className="overflow-hidden rounded-xl border border-white/10">
                              {/* Category header bar */}
                              <div className="border-b border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-text-muted capitalize">
                                {category}
                              </div>
                              {/* One row per tool — all 3 values side by side */}
                              <div className="divide-y divide-white/5">
                                {costs.map((cost) => {
                                  // LoRA Training uses per-plan credit cost, not the global CreditCost value
                                  const isLora = cost.operationType === 'LORA_TRAINING';
                                  const loraCredits = activePlan?.loraTrainingCredits ?? 0;
                                  const effectiveCredits = isLora ? loraCredits : cost.credits;
                                  const unavailable = isLora && loraCredits === 0;
                                  const dollarLabel = unavailable ? '' : calcDollarCost(effectiveCredits, activePlan);
                                  return (
                                    <div key={cost.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-2.5">
                                      <span className="text-sm text-text-secondary">{cost.label}</span>
                                      {unavailable ? (
                                        <>
                                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-semibold text-white/30 tabular-nums">
                                            —
                                          </span>
                                          <span className="w-16 text-right text-xs text-white/30">
                                            Not available
                                          </span>
                                        </>
                                      ) : (
                                        <>
                                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-semibold text-white tabular-nums">
                                            {effectiveCredits} cr
                                          </span>
                                          <span className="w-16 text-right text-sm font-semibold text-accent-pink tabular-nums">
                                            {dollarLabel}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </section>

                {/* ---- Plan Comparison Table ---- */}
                <section className="mt-10 rounded-2xl border border-white/10 bg-background-secondary p-5 shadow-card">
                  <div className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-accent-pink" aria-hidden="true" />
                    <h2 className="text-lg font-semibold text-white">Plan comparison</h2>
                  </div>
                  <p className="mt-1 text-sm text-text-secondary">
                    Compare feature access across tiers.
                  </p>

                  <div className="mt-5 overflow-x-auto">
                    <table className="min-w-[720px] w-full border-separate border-spacing-0">
                      <thead>
                        <tr>
                          <th className="sticky left-0 z-10 rounded-l-xl border border-white/10 bg-background-tertiary px-4 py-3 text-left text-xs font-semibold text-text-muted">
                            Feature
                          </th>
                          {paidPlans.map((plan, i) => (
                            <th
                              key={plan.id}
                              className={cn(
                                'border border-white/10 bg-background-tertiary px-4 py-3 text-left text-xs font-semibold text-text-muted',
                                i === paidPlans.length - 1 && 'rounded-r-xl'
                              )}
                            >
                              {plan.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {[
                          { label: 'Monthly price', values: paidPlans.map((p) => `$${p.monthlyPrice.toFixed(2)}/mo`) },
                          { label: 'Annual price', values: paidPlans.map((p) => p.annualPrice > 0 ? `$${p.annualPrice.toFixed(2)}/mo` : '—') },
                          { label: 'Monthly credits', values: paidPlans.map((p) => `${p.monthlyCredits.toLocaleString()} / mo`) },
                          { label: 'Chat tokens/mo', values: paidPlans.map((p) => formatTokenBudget(p.monthlyCredits, p.tokensPerCredit ?? 0, p.dailyTokenLimit ?? 0)) },
                          { label: 'AI Companions', values: paidPlans.map((p) => p.maxCompanions === -1 ? 'Unlimited' : String(p.maxCompanions)) },
                          { label: 'Credit rollover', values: paidPlans.map((p) => p.creditRollover > 0 ? `Up to ${p.creditRollover.toLocaleString()}` : '—') },
                        ].map((row, index, rows) => {
                          const isLast = index === rows.length - 1;
                          return (
                            <tr key={row.label}>
                              <td
                                className={cn(
                                  'sticky left-0 z-10 border border-white/10 bg-background-secondary px-4 py-3 font-medium text-white',
                                  isLast && 'rounded-bl-xl'
                                )}
                              >
                                {row.label}
                              </td>
                              {row.values.map((value, valueIndex) => (
                                <td
                                  key={`${row.label}-${valueIndex}`}
                                  className={cn(
                                    'border border-white/10 bg-background-secondary px-4 py-3 text-text-secondary',
                                    isLast && valueIndex === row.values.length - 1 && 'rounded-br-xl'
                                  )}
                                >
                                  {value}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* ---- Pause / Cancel ---- */}
                <section className="mt-10 grid gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-background-secondary p-5 shadow-card">
                    <div className="flex items-center gap-2">
                      <PauseCircle className="h-5 w-5 text-accent-pink" aria-hidden="true" />
                      <h2 className="text-lg font-semibold text-white">Pause subscription</h2>
                    </div>
                    <p className="mt-1 text-sm text-text-secondary">
                      Temporarily stop renewals while keeping your plan reserved.
                    </p>

                    <details className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                      <summary className="cursor-pointer select-none text-sm font-semibold text-white">
                        Pause options &amp; retention offers
                      </summary>
                      <div className="mt-3 space-y-3 text-sm text-text-secondary">
                        <div className="rounded-xl border border-white/10 bg-black/10 p-3">
                          Pause for 1 month and keep your current tier ready to resume anytime.
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/10 p-3">
                          Downgrade instead to reduce cost while staying subscribed.
                        </div>
                      </div>
                    </details>

                    <button
                      type="button"
                      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled
                      title="Subscription management coming soon"
                    >
                      <PauseCircle className="h-4 w-4" aria-hidden="true" />
                      Pause plan
                    </button>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-background-secondary p-5 shadow-card">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-accent-pink" aria-hidden="true" />
                      <h2 className="text-lg font-semibold text-white">Cancel subscription</h2>
                    </div>
                    <p className="mt-1 text-sm text-text-secondary">
                      Cancel future renewals. Access typically remains until your billing period ends.
                    </p>

                    <details className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                      <summary className="cursor-pointer select-none text-sm font-semibold text-white">
                        Before you cancel…
                      </summary>
                      <div className="mt-3 space-y-3 text-sm text-text-secondary">
                        <div className="rounded-xl border border-white/10 bg-black/10 p-3">
                          Keep your plan and get a limited-time discount (e.g. 20% off for 3 months).
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/10 p-3">
                          Switch to a lower tier to retain subscriber perks with a smaller commitment.
                        </div>
                      </div>
                    </details>

                    <button
                      type="button"
                      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled
                      title="Subscription management coming soon"
                    >
                      <XCircle className="h-4 w-4" aria-hidden="true" />
                      Cancel plan
                    </button>
                  </div>
                </section>
              </>
            )}
          </div>
          <Footer />
        </main>
      </div>
    </SidebarProvider>
  );
}
