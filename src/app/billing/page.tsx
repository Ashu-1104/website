import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { SidebarProvider } from '@/context/SidebarContext';
import Link from 'next/link';
import { ArrowRight, Check, CreditCard, Download, Info, MessageSquare, Plus, ShieldAlert, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAccessTokenFromCookies, verifyAccessToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import dynamicImport from 'next/dynamic';
import type { DailyUsagePoint } from '@/components/billing/CreditUsageChart';

export const dynamic = 'force-dynamic';

// Recharts is client-only — load without SSR
const CreditUsageChart = dynamicImport(() => import('@/components/billing/CreditUsageChart'), {
  ssr: false,
  loading: () => <div className="h-[300px] animate-pulse rounded-2xl bg-white/5" />,
});

type CreditPackage = {
  id: string;
  credits: number;
  priceUsd: number;
  badge?: string;
};

type PaymentMethod = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault?: boolean;
};

type Invoice = {
  id: string;
  createdAt: Date;
  amountUsd: number;
  status: 'paid' | 'open' | 'void';
  pdfUrl?: string;
};

type CreditTransaction = {
  id: string;
  occurredAt: Date;
  amount: number; // negative = spend, positive = add
  description: string;
  source: string;
};

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
const MONEY_FORMATTER = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });

const CREDIT_PACKAGES: ReadonlyArray<CreditPackage> = [
  { id: 'credits_100', credits: 100, priceUsd: 9.99 },
  { id: 'credits_250', credits: 250, priceUsd: 19.99, badge: 'Popular' },
  { id: 'credits_500', credits: 500, priceUsd: 34.99, badge: 'Best value' },
] as const;

const MOCK_PAYMENT_METHODS: ReadonlyArray<PaymentMethod> = [
  { id: 'pm_1', brand: 'Visa', last4: '4242', expMonth: 8, expYear: 2028, isDefault: true },
  { id: 'pm_2', brand: 'Mastercard', last4: '4444', expMonth: 11, expYear: 2027 },
] as const;

const MOCK_INVOICES: ReadonlyArray<Invoice> = [
  { id: 'inv_1001', createdAt: new Date('2025-12-01T12:00:00Z'), amountUsd: 12.99, status: 'paid' },
  { id: 'inv_1000', createdAt: new Date('2025-11-01T12:00:00Z'), amountUsd: 12.99, status: 'paid' },
] as const;

type ChatUsageData = {
  userId: string;
  plan: string;
  // Paid plans
  creditsUsed: number;
  monthlyCredits: number;
  chatTokensAccumulated: number;
  tokensPerCredit: number;
  // Free plan
  dailyTokensUsed: number;
  dailyTokenLimit: number;
  dailyResetAt: Date | null;
} | null;

// Single auth call — returns userId alongside subscription data so the page
// never has to verify the token a second time (fixes double-auth bug).
async function getChatUsage(): Promise<ChatUsageData> {
  try {
    const token = await getAccessTokenFromCookies();
    if (!token) return null;
    const payload = await verifyAccessToken(token);
    if (!payload?.userId) return null;

    const subscription = await prisma.subscription.findUnique({
      where: { userId: payload.userId },
      select: {
        plan: true,
        creditsUsed: true,
        monthlyCredits: true,
        chatTokensAccumulated: true,
        chatDailyTokensUsed: true,
        chatDailyResetAt: true,
      },
    });

    if (!subscription) return null;

    const planConfig = await prisma.planConfig.findUnique({
      where: { planKey: subscription.plan },
      select: { tokensPerCredit: true, dailyTokenLimit: true, name: true },
    });

    return {
      userId: payload.userId,
      plan: planConfig?.name ?? subscription.plan,
      creditsUsed: subscription.creditsUsed,
      monthlyCredits: subscription.monthlyCredits,
      chatTokensAccumulated: subscription.chatTokensAccumulated,
      tokensPerCredit: planConfig?.tokensPerCredit ?? 0,
      dailyTokensUsed: subscription.chatDailyTokensUsed,
      dailyTokenLimit: planConfig?.dailyTokenLimit ?? 0,
      dailyResetAt: subscription.chatDailyResetAt,
    };
  } catch {
    return null;
  }
}

const DAYS_IN_CHART = 30;
const TX_PAGE_SIZE = 8;

const DATE_LABEL_FORMATTER = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

/**
 * Build the last N days of daily credit usage from CreditTransaction rows.
 * Returns one point per day with per-category totals (spend only, i.e. amount < 0).
 */
async function getChartData(userId: string): Promise<DailyUsagePoint[]> {
  const since = new Date();
  since.setDate(since.getDate() - (DAYS_IN_CHART - 1));
  since.setHours(0, 0, 0, 0);

  const rows = await prisma.creditTransaction.findMany({
    where: {
      userId,
      occurredAt: { gte: since },
      amount: { lt: 0 }, // spend only
    },
    select: { occurredAt: true, amount: true, category: true },
    orderBy: { occurredAt: 'asc' },
  });

  // Build a map of date-string → per-category totals
  const map = new Map<string, DailyUsagePoint>();

  // Pre-fill every day in the range so there are no gaps in the chart
  for (let i = 0; i < DAYS_IN_CHART; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    const label = DATE_LABEL_FORMATTER.format(d);
    map.set(label, { date: label, image: 0, video: 0, audio: 0, chat: 0 });
  }

  for (const row of rows) {
    const label = DATE_LABEL_FORMATTER.format(row.occurredAt);
    const point = map.get(label);
    if (!point) continue;
    const spend = Math.abs(row.amount);
    if (row.category === 'image') point.image += spend;
    else if (row.category === 'video') point.video += spend;
    else if (row.category === 'audio') point.audio += spend;
    else if (row.category === 'chat') point.chat += spend;
  }

  return Array.from(map.values());
}

/**
 * Fetch paginated credit transaction history for the user.
 * Page must already be clamped to [1, totalPages] before calling.
 */
async function getTransactions(
  userId: string,
  page: number,
): Promise<{ items: CreditTransaction[]; total: number }> {
  // Get total count first so we can clamp page before fetching rows.
  const total = await prisma.creditTransaction.count({ where: { userId } });
  const totalPages = Math.max(1, Math.ceil(total / TX_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const items = await prisma.creditTransaction.findMany({
    where: { userId },
    orderBy: { occurredAt: 'desc' },
    skip: (safePage - 1) * TX_PAGE_SIZE,
    take: TX_PAGE_SIZE,
    select: { id: true, occurredAt: true, amount: true, description: true, source: true },
  });

  return { items, total };
}

function parsePositiveInt(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function clampInt(value: number, min: number, max: number) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function formatMoney(amountUsd: number) {
  return MONEY_FORMATTER.format(amountUsd);
}

function formatTxAmount(amount: number) {
  const prefix = amount > 0 ? '+' : '';
  return `${prefix}${amount}`;
}

function buildHrefWithParam(pathname: string, searchParams: Record<string, string | string[] | undefined>, key: string, value: string) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    const raw = Array.isArray(v) ? v[0] : v;
    if (!raw || k === key) continue;
    params.set(k, raw);
  }
  params.set(key, value);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const safeSearchParams = searchParams ?? {};

  // Single auth call — userId is embedded in chatUsage to avoid double token verification
  const chatUsage = await getChatUsage();
  const userId = chatUsage?.userId ?? null;

  // Raw requested page — getTransactions will clamp it against real total internally
  const requestedPage = parsePositiveInt(safeSearchParams.txPage) ?? 1;

  // Fetch chart data and transactions in parallel (only when logged in)
  const [chartData, txResult] = await Promise.all([
    userId ? getChartData(userId) : Promise.resolve([] as DailyUsagePoint[]),
    userId ? getTransactions(userId, requestedPage) : Promise.resolve({ items: [] as CreditTransaction[], total: 0 }),
  ]);

  const totalTxPages = Math.max(1, Math.ceil(txResult.total / TX_PAGE_SIZE));
  // Re-clamp for pagination UI (getTransactions already clamped for the DB query)
  const txPage = clampInt(requestedPage, 1, totalTxPages);
  const txSlice = txResult.items;

  // Resolve the token-per-credit rate for the chart tooltip.
  // Priority: user's actual plan rate → any active paid plan (Starter) → hardcoded fallback.
  let chartTokensPerCredit = chatUsage?.tokensPerCredit ?? 0;
  let chartPlanLabel = chatUsage?.plan ?? '';
  if (!chartTokensPerCredit) {
    try {
      const starterConfig = await prisma.planConfig.findUnique({
        where: { planKey: 'BASIC' },
        select: { tokensPerCredit: true, name: true },
      });
      chartTokensPerCredit = starterConfig?.tokensPerCredit ?? 16667;
      if (!chartPlanLabel) chartPlanLabel = starterConfig?.name ?? 'Starter';
    } catch {
      chartTokensPerCredit = 16667;
      if (!chartPlanLabel) chartPlanLabel = 'Starter';
    }
  }

  return (
    <SidebarProvider>
      <div className="app-layout">
        <Sidebar />
        <Header />
        <main className="main-content">
          <div className="content-wrapper">
            <h1 className="page-title">Billing</h1>
            <p className="mt-2 text-text-secondary">Manage credits, payment methods, invoices, and usage history.</p>

            <section className="mt-8 grid gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-background-secondary p-5 shadow-card lg:col-span-2">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-accent-pink" aria-hidden="true" />
                      <h2 className="text-lg font-semibold text-white">Credit balance</h2>
                    </div>
                    <div className="mt-3 flex items-end gap-3">
                      <div className="text-4xl font-semibold text-white">
                        {chatUsage ? Math.max(0, chatUsage.monthlyCredits - chatUsage.creditsUsed).toLocaleString() : '—'}
                      </div>
                      <div className="pb-1 text-sm font-medium text-text-secondary">
                        {chatUsage ? `/ ${chatUsage.monthlyCredits.toLocaleString()} credits` : 'credits'}
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-text-secondary">
                      {chatUsage
                        ? `${chatUsage.creditsUsed.toLocaleString()} used · ${Math.max(0, chatUsage.monthlyCredits - chatUsage.creditsUsed).toLocaleString()} remaining on ${chatUsage.plan} plan`
                        : 'Credits are used for pay-as-you-go tools. Subscriptions can include monthly credit bonuses.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href="/subscription"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10"
                    >
                      Manage plan
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                    <a
                      href="#credit-packages"
                      className="btn-primary"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Buy credits
                    </a>
                  </div>
                </div>

                <div className="mt-5 flex items-start gap-3 rounded-2xl border border-white/10 bg-gradient-to-r from-accent-pink/10 via-purple-500/10 to-transparent p-4">
                  <Info className="mt-0.5 h-4 w-4 text-accent-pink" aria-hidden="true" />
                  <div className="text-sm text-text-secondary">
                    Payment methods, invoices, and credit purchases require Stripe integration (coming soon).
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-background-secondary p-5 shadow-card">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-accent-pink" aria-hidden="true" />
                  <h2 className="text-lg font-semibold text-white">Auto-recharge</h2>
                </div>
                <p className="mt-1 text-sm text-text-secondary">
                  Automatically buy credits when your balance drops below a threshold.
                </p>

                <div className="mt-5 space-y-4">
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white">Enable auto-recharge</div>
                      <div className="mt-1 text-xs text-text-secondary">Buys your default package when you&apos;re low.</div>
                    </div>
                    <button
                      type="button"
                      className={cn('toggle-switch opacity-60', false && 'toggle-switch-active')}
                      aria-pressed={false}
                      disabled
                      title="Coming soon"
                    >
                      <span className="toggle-switch-knob" />
                    </button>
                  </div>

                  <label className="block space-y-1 text-xs text-text-muted">
                    <span>Recharge when below</span>
                    <input
                      type="number"
                      min={0}
                      step={10}
                      defaultValue={50}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-text-muted focus:border-accent-pink/40 focus:outline-none focus:ring-2 focus:ring-accent-pink/20 disabled:opacity-60"
                      disabled
                    />
                  </label>

                  <div className="text-xs text-text-secondary">
                    Uses your default payment method. You&apos;ll always see a receipt in billing history.
                  </div>
                </div>
              </div>
            </section>

            {/* ── Chat Token / Daily Usage ──────────────────────────────── */}
            {chatUsage && (
              <section className="mt-6 rounded-2xl border border-white/10 bg-background-secondary p-5 shadow-card">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-accent-pink" aria-hidden="true" />
                  <h2 className="text-lg font-semibold text-white">Chat usage</h2>
                  <span className="ml-auto rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-text-secondary">
                    {chatUsage.plan} plan
                  </span>
                </div>

                {chatUsage.dailyTokenLimit > 0 ? (
                  /* FREE PLAN — daily token bar */
                  <div className="mt-5 space-y-3">
                    <div className="flex items-end justify-between gap-2">
                      <div className="text-sm text-text-secondary">Tokens used today</div>
                      <div className="tabular-nums text-sm font-semibold text-white">
                        {chatUsage.dailyTokensUsed.toLocaleString()}
                        <span className="text-text-muted"> / {chatUsage.dailyTokenLimit.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-accent-pink transition-all"
                        style={{ width: `${Math.min(100, (chatUsage.dailyTokensUsed / chatUsage.dailyTokenLimit) * 100).toFixed(1)}%` }}
                      />
                    </div>
                    {chatUsage.dailyResetAt && (
                      <p className="text-xs text-text-muted">
                        Resets at midnight UTC
                        {' '}({new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }).format(chatUsage.dailyResetAt)})
                      </p>
                    )}
                    <div className="flex items-start gap-3 rounded-2xl border border-accent-pink/20 bg-accent-pink/5 p-3">
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent-pink" aria-hidden="true" />
                      <p className="text-xs text-text-secondary">
                        Free plan includes 2,000 tokens/day.{' '}
                        <Link href="/subscription" className="font-semibold text-accent-pink hover:underline">
                          Upgrade
                        </Link>{' '}
                        for unlimited chat with no daily cap.
                      </p>
                    </div>
                  </div>
                ) : chatUsage.tokensPerCredit > 0 ? (
                  /* PAID PLAN — token accumulator and credits */
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs text-text-muted">Credits used (chat + tools)</div>
                      <div className="mt-1 text-2xl font-semibold text-white tabular-nums">
                        {chatUsage.creditsUsed.toLocaleString()}
                        <span className="text-sm font-normal text-text-muted"> / {chatUsage.monthlyCredits.toLocaleString()}</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-accent-pink"
                          style={{ width: `${Math.min(100, (chatUsage.creditsUsed / Math.max(chatUsage.monthlyCredits, 1)) * 100).toFixed(1)}%` }}
                        />
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs text-text-muted">Token carry-over</div>
                      <div className="mt-1 text-2xl font-semibold text-white tabular-nums">
                        {chatUsage.chatTokensAccumulated.toLocaleString()}
                      </div>
                      <p className="mt-1 text-xs text-text-muted">
                        Accumulates until {chatUsage.tokensPerCredit.toLocaleString()} tokens → 1 credit deducted
                      </p>
                    </div>
                  </div>
                ) : (
                  /* ENTERPRISE — unlimited */
                  <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <p className="text-sm font-semibold text-emerald-300">Unlimited chat included</p>
                    <p className="mt-1 text-xs text-text-secondary">
                      No daily cap and no per-message credit deduction on your plan.
                      Total tokens tracked: <span className="font-semibold text-white">{chatUsage.chatTokensAccumulated.toLocaleString()}</span>
                    </p>
                  </div>
                )}
              </section>
            )}

            <section id="credit-packages" className="mt-10">
              <div className="section-header">
                <h2 className="section-title">Credit packages</h2>
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                {CREDIT_PACKAGES.map((pack) => (
                  <div key={pack.id} className="relative rounded-2xl border border-white/10 bg-background-secondary p-5 shadow-card">
                    {pack.badge ? (
                      <div className="absolute right-5 top-5 rounded-full border border-accent-pink/20 bg-accent-pink/10 px-3 py-1 text-xs font-semibold text-accent-pink">
                        {pack.badge}
                      </div>
                    ) : null}
                    <div className="text-sm font-semibold text-white">{pack.credits} credits</div>
                    <div className="mt-2 text-3xl font-semibold text-white">{formatMoney(pack.priceUsd)}</div>
                    <div className="mt-2 text-sm text-text-secondary">
                      {MONEY_FORMATTER.format(pack.priceUsd / pack.credits)} / credit
                    </div>

                    <button
                      type="button"
                      className="btn-primary mt-6 w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
                      disabled
                      title="Checkout coming soon"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Buy {pack.credits}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-10 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-background-secondary p-5 shadow-card">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-accent-pink" aria-hidden="true" />
                  <h2 className="text-lg font-semibold text-white">Payment methods</h2>
                </div>
                <p className="mt-1 text-sm text-text-secondary">Add/remove cards and set your default.</p>

                <div className="mt-5 space-y-3">
                  {MOCK_PAYMENT_METHODS.map((method) => (
                    <div
                      key={method.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold text-white">
                            {method.brand} •••• {method.last4}
                          </div>
                          {method.isDefault ? (
                            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                              Default
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 text-xs text-text-secondary">
                          Expires {method.expMonth.toString().padStart(2, '0')}/{String(method.expYear).slice(-2)}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled
                          title="Coming soon"
                        >
                          <Check className="h-4 w-4" aria-hidden="true" />
                          Set default
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled
                          title="Coming soon"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled
                  title="Stripe integration coming soon"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add payment method
                </button>
              </div>

              <div className="rounded-2xl border border-white/10 bg-background-secondary p-5 shadow-card">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-accent-pink" aria-hidden="true" />
                  <h2 className="text-lg font-semibold text-white">Spending limits</h2>
                </div>
                <p className="mt-1 text-sm text-text-secondary">Set an optional monthly cap for credit purchases.</p>

                <div className="mt-5 space-y-4">
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white">Enable monthly cap</div>
                      <div className="mt-1 text-xs text-text-secondary">Auto-recharge respects this limit.</div>
                    </div>
                    <button
                      type="button"
                      className={cn('toggle-switch opacity-60', false && 'toggle-switch-active')}
                      aria-pressed={false}
                      disabled
                      title="Coming soon"
                    >
                      <span className="toggle-switch-knob" />
                    </button>
                  </div>

                  <label className="block space-y-1 text-xs text-text-muted">
                    <span>Monthly cap (USD)</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      defaultValue={50}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-text-muted focus:border-accent-pink/40 focus:outline-none focus:ring-2 focus:ring-accent-pink/20 disabled:opacity-60"
                      disabled
                    />
                  </label>

                  <div className="text-xs text-text-secondary">
                    You can still purchase credits manually even if auto-recharge is off.
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-10 rounded-2xl border border-white/10 bg-background-secondary p-5 shadow-card">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-accent-pink" aria-hidden="true" />
                <h2 className="text-lg font-semibold text-white">Billing history</h2>
              </div>
              <p className="mt-1 text-sm text-text-secondary">Invoices, receipts, and downloadable PDFs.</p>

              <div className="mt-5 overflow-x-auto">
                <table className="min-w-[720px] w-full border-separate border-spacing-0">
                  <thead>
                    <tr>
                      {['Invoice', 'Date', 'Amount', 'Status', ''].map((header, index, headers) => (
                        <th
                          key={header || index}
                          className={cn(
                            'border border-white/10 bg-background-tertiary px-4 py-3 text-left text-xs font-semibold text-text-muted',
                            index === 0 && 'rounded-l-xl',
                            index === headers.length - 1 && 'rounded-r-xl'
                          )}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {MOCK_INVOICES.map((invoice, index, invoices) => {
                      const isLast = index === invoices.length - 1;
                      const statusStyles =
                        invoice.status === 'paid'
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                          : invoice.status === 'open'
                            ? 'border-amber-500/20 bg-amber-500/10 text-amber-300'
                            : 'border-rose-500/20 bg-rose-500/10 text-rose-300';

                      return (
                        <tr key={invoice.id}>
                          <td className={cn('border border-white/10 bg-background-secondary px-4 py-3 font-medium text-white', isLast && 'rounded-bl-xl')}>
                            {invoice.id}
                          </td>
                          <td className="border border-white/10 bg-background-secondary px-4 py-3 text-text-secondary">
                            {DATE_FORMATTER.format(invoice.createdAt)}
                          </td>
                          <td className="border border-white/10 bg-background-secondary px-4 py-3 text-text-secondary">
                            {formatMoney(invoice.amountUsd)}
                          </td>
                          <td className="border border-white/10 bg-background-secondary px-4 py-3">
                            <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold', statusStyles)}>
                              {invoice.status.toUpperCase()}
                            </span>
                          </td>
                          <td className={cn('border border-white/10 bg-background-secondary px-4 py-3', isLast && 'rounded-br-xl')}>
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={!invoice.pdfUrl}
                              title={invoice.pdfUrl ? 'Download PDF' : 'PDF coming soon'}
                            >
                              <Download className="h-4 w-4" aria-hidden="true" />
                              PDF
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ── Credit Usage Chart ────────────────────────────────────── */}
            <section className="mt-10 rounded-2xl border border-white/10 bg-background-secondary p-5 shadow-card">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent-pink" aria-hidden="true" />
                <h2 className="text-lg font-semibold text-white">Credits Over Time</h2>
              </div>
              <p className="mt-1 text-sm text-text-secondary">Daily credit spend by category — last 30 days.</p>

              <div className="mt-6">
                {chartData.length > 0 ? (
                  <CreditUsageChart
                    data={chartData}
                    tokensPerCredit={chartTokensPerCredit}
                    planLabel={chartPlanLabel}
                  />
                ) : (
                  <div className="flex h-[300px] items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-text-muted">
                    {userId ? 'No usage in the last 30 days.' : 'Sign in to see your usage chart.'}
                  </div>
                )}
              </div>
            </section>

            <section className="mt-10 rounded-2xl border border-white/10 bg-background-secondary p-5 shadow-card">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent-pink" aria-hidden="true" />
                <h2 className="text-lg font-semibold text-white">Credit usage history</h2>
              </div>
              <p className="mt-1 text-sm text-text-secondary">
                A transaction log of credits earned/spent, with timestamps and descriptions.
              </p>

              {txSlice.length === 0 ? (
                <div className="mt-5 flex h-32 items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-text-muted">
                  {userId ? 'No transactions yet. Start using AI tools to see your history.' : 'Sign in to see your credit history.'}
                </div>
              ) : (
                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-[720px] w-full border-separate border-spacing-0">
                    <thead>
                      <tr>
                        {['Date', 'Description', 'Source', 'Amount'].map((header, index, headers) => (
                          <th
                            key={header}
                            className={cn(
                              'border border-white/10 bg-background-tertiary px-4 py-3 text-left text-xs font-semibold text-text-muted',
                              index === 0 && 'rounded-l-xl',
                              index === headers.length - 1 && 'rounded-r-xl'
                            )}
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {txSlice.map((tx, index) => {
                        const isLast = index === txSlice.length - 1;
                        const amountStyles = tx.amount >= 0 ? 'text-emerald-300' : 'text-rose-200';
                        return (
                          <tr key={tx.id}>
                            <td className={cn('border border-white/10 bg-background-secondary px-4 py-3 text-text-secondary', isLast && 'rounded-bl-xl')}>
                              {DATE_FORMATTER.format(tx.occurredAt)}
                            </td>
                            <td className="border border-white/10 bg-background-secondary px-4 py-3 font-medium text-white">
                              {tx.description}
                            </td>
                            <td className="border border-white/10 bg-background-secondary px-4 py-3 text-text-secondary capitalize">
                              {tx.source}
                            </td>
                            <td className={cn('border border-white/10 bg-background-secondary px-4 py-3 text-right font-semibold tabular-nums', amountStyles, isLast && 'rounded-br-xl')}>
                              {formatTxAmount(tx.amount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-text-secondary">
                  Page <span className="font-semibold text-white">{txPage}</span> of{' '}
                  <span className="font-semibold text-white">{totalTxPages}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={buildHrefWithParam('/billing', safeSearchParams, 'txPage', String(Math.max(1, txPage - 1)))}
                    className={cn(
                      'inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10',
                      txPage === 1 && 'pointer-events-none opacity-50'
                    )}
                    aria-disabled={txPage === 1}
                  >
                    Prev
                  </Link>
                  <Link
                    href={buildHrefWithParam('/billing', safeSearchParams, 'txPage', String(Math.min(totalTxPages, txPage + 1)))}
                    className={cn(
                      'inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10',
                      txPage === totalTxPages && 'pointer-events-none opacity-50'
                    )}
                    aria-disabled={txPage === totalTxPages}
                  >
                    Next
                  </Link>
                </div>
              </div>
            </section>

            <section className="mt-10 rounded-2xl border border-white/10 bg-background-secondary p-5 shadow-card">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-accent-pink" aria-hidden="true" />
                <h2 className="text-lg font-semibold text-white">Billing address</h2>
              </div>
              <p className="mt-1 text-sm text-text-secondary">Used for invoices and tax purposes.</p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {[
                  { label: 'Full name', placeholder: 'Jane Doe' },
                  { label: 'Company (optional)', placeholder: 'Acme Inc.' },
                  { label: 'Address line 1', placeholder: '123 Main St' },
                  { label: 'Address line 2 (optional)', placeholder: 'Apt 4B' },
                  { label: 'City', placeholder: 'San Francisco' },
                  { label: 'State / Region', placeholder: 'CA' },
                  { label: 'Postal code', placeholder: '94103' },
                  { label: 'Country', placeholder: 'United States' },
                ].map((field) => (
                  <label key={field.label} className="block space-y-1 text-xs text-text-muted">
                    <span>{field.label}</span>
                    <input
                      type="text"
                      placeholder={field.placeholder}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-text-muted focus:border-accent-pink/40 focus:outline-none focus:ring-2 focus:ring-accent-pink/20"
                      disabled
                    />
                  </label>
                ))}
              </div>

              <button
                type="button"
                className="btn-primary mt-6 disabled:cursor-not-allowed disabled:opacity-60"
                disabled
                title="Coming soon"
              >
                Save billing address
              </button>
            </section>
          </div>
          <Footer />
        </main>
      </div>
    </SidebarProvider>
  );
}
