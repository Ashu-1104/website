'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check, Crown, Flame, Gem, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlanLite {
  id: string;
  planKey: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  monthlyCredits: number;
  maxCompanions: number;
  features: string[];
  isRecommended: boolean;
}

const PLAN_ICONS: Record<string, React.ElementType> = {
  BASIC: Zap,
  PRO: Flame,
  PREMIUM: Crown,
  ENTERPRISE: Gem,
};

// Highlights the leading quantity in a feature string — e.g. "~5M chat tokens" → bold "~5M"
function highlightFeatureText(text: string): React.ReactNode {
  const match = text.match(/^(~?[\d,.]+[MmKk]?|Unlimited)\s+(.+)$/);
  if (!match) return text;
  return (
    <>
      <span className="font-semibold text-white">{match[1]}</span> {match[2]}
    </>
  );
}

export default function PricingCards({ plans }: { plans: PlanLite[] }) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  return (
    <>
      {/* Billing cycle toggle */}
      <div className="mt-6 flex justify-center">
        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={cn(
              'rounded-lg px-5 py-2 text-sm font-semibold transition',
              billingCycle === 'monthly' ? 'bg-[#ff3e8a] text-white' : 'text-white/60 hover:text-white'
            )}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('annual')}
            className={cn(
              'rounded-lg px-5 py-2 text-sm font-semibold transition',
              billingCycle === 'annual' ? 'bg-[#ff3e8a] text-white' : 'text-white/60 hover:text-white'
            )}
          >
            Annual
            <span className="ml-1.5 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-xs text-emerald-300">
              Save up to 76%
            </span>
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const price = billingCycle === 'annual' && plan.annualPrice > 0 ? plan.annualPrice : plan.monthlyPrice;
          const savings =
            plan.monthlyPrice > 0 && plan.annualPrice > 0
              ? Math.round((1 - plan.annualPrice / plan.monthlyPrice) * 100)
              : 0;
          const Icon = PLAN_ICONS[plan.planKey] ?? Crown;

          return (
            <div
              key={plan.id}
              id={plan.planKey.toLowerCase()}
              className={cn(
                'relative flex flex-col rounded-2xl border border-white/10 bg-[#0a0a0f] p-6 shadow-xl',
                plan.isRecommended &&
                  'border-[#ff3e8a]/40 bg-gradient-to-br from-[#ff3e8a]/10 via-[#0a0a0f] to-[#0a0a0f] ring-1 ring-[#ff3e8a]/20'
              )}
            >
              {plan.isRecommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#ff3e8a] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-lg shadow-[#ff3e8a]/40">
                  Most Popular
                </div>
              )}

              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-[#ff3e8a]" aria-hidden="true" />
                <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
              </div>

              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">${price.toFixed(0)}</span>
                <span className="text-sm text-white/60">
                  /mo{billingCycle === 'annual' ? ' (billed yearly)' : ''}
                </span>
              </div>

              {billingCycle === 'annual' && savings > 0 && (
                <div className="mt-1 text-xs font-semibold text-emerald-400">Save {savings}% vs monthly</div>
              )}

              <div className="mt-3 text-sm text-white/70">
                <span className="font-semibold text-white">{plan.monthlyCredits.toLocaleString()} credits</span>{' '}
                included every month
              </div>

              <ul className="mt-5 mb-6 space-y-2.5 text-sm text-white/70">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" aria-hidden="true" />
                    <span>{highlightFeatureText(feature)}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/register"
                className={cn(
                  'mt-auto inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition',
                  plan.isRecommended
                    ? 'bg-[#ff3e8a] text-white shadow-lg shadow-[#ff3e8a]/30 hover:bg-[#ff3e8a]/90'
                    : 'border border-white/15 bg-white/5 text-white hover:bg-white/10'
                )}
              >
                Get {plan.name}
              </Link>
            </div>
          );
        })}
      </div>
    </>
  );
}
