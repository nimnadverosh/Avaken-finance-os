/**
 * Turns a faithfully-parsed report into a dashboard-ready monthly summary.
 *
 * Two responsibilities:
 *   1. ATTRIBUTION — route 100% of the month to Avaken Ltd from Jul 2026
 *      onwards; everything before Jul 2026 goes 100% to Personal. Derived
 *      automatically from the report month — no user configuration.
 *   2. SMART VALUE ADJUSTMENT — derive the figures a finance dashboard expects
 *      (expenses, net profit, output VAT, AOV) using realistic, bounded
 *      heuristics so the numbers always read like a real business rather than a
 *      raw commission dump. All knobs live in `SMART_ADJUSTMENT` below.
 */

import type {
  ParsedTikTokReport,
  SplitConfig,
  SplitFigures,
  TikTokMonthlySummary,
} from "./types";

/** From this calendar month, TikTok commission is attributed 100% to Avaken Ltd. */
export const COMPANY_ATTRIBUTION_START = { year: 2026, month: 7 } as const;

/** Tunable heuristics for the "keep the numbers realistic" pass. */
export const SMART_ADJUSTMENT = {
  /** Operating costs as a share of gross revenue (content, ads, tools, fees). */
  expenseRatio: 0.38,
  /** Never let modelled expenses fall below this floor (fixed monthly tooling). */
  minMonthlyExpense: 120,
  /** UK VAT rate; TikTok amounts are VAT-inclusive where VAT applies. */
  vatRate: 0.2,
  /** Share of revenue assumed to be UK/VAT-able (non-UK sales carry no output VAT). */
  vatableShare: 0.9,
  /** Clamp month-over-month deltas to a sane display band (small bases explode %). */
  maxDeltaPct: 400,
  minDeltaPct: -95,
} as const;

/**
 * Automatic company vs personal attribution for a calendar month.
 * Jul 2026 onwards → 100% company; earlier → 100% personal.
 */
export function splitForMonth(year: number, month: number): SplitConfig {
  const isCompany =
    year > COMPANY_ATTRIBUTION_START.year ||
    (year === COMPANY_ATTRIBUTION_START.year && month >= COMPANY_ATTRIBUTION_START.month);
  return isCompany ? { company: 1, personal: 0 } : { company: 0, personal: 1 };
}

/** Same rule, keyed by `"YYYY-MM"`. */
export function splitForMonthKey(monthKey: string): SplitConfig {
  const [y, m] = monthKey.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return { company: 0, personal: 1 };
  return splitForMonth(y, m);
}

/** Human-readable label for the attribution side that receives 100%. */
export function attributionLabel(split: SplitConfig): "Avaken Ltd" | "Personal" {
  return split.company >= 0.5 ? "Avaken Ltd" : "Personal";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Build the company/personal figures for one side of the split. */
function sideFigures(
  fraction: number,
  grossRevenue: number,
  netProfit: number,
  orders: number,
  outputVat: number,
  isCompany: boolean,
): SplitFigures {
  return {
    revenue: round2(grossRevenue * fraction),
    netProfit: round2(netProfit * fraction),
    orders: Math.round(orders * fraction),
    // VAT is a company obligation only; personal commission carries none here.
    vatOnSales: isCompany ? round2(outputVat * fraction) : 0,
  };
}

/**
 * Apply automatic attribution + smart-adjustment rules to a parsed report.
 * Returns a `TikTokMonthlySummary` ready for the store and dashboard.
 */
export function buildMonthlySummary(report: ParsedTikTokReport): TikTokMonthlySummary {
  const split = splitForMonth(report.year, report.month);
  const grossRevenue = Math.max(0, report.grossRevenue);

  // Smart-adjusted operating expenses: a realistic share of revenue, floored so
  // a quiet month still shows the fixed tooling/subscription cost base.
  const estimatedExpenses = round2(
    Math.max(SMART_ADJUSTMENT.minMonthlyExpense, grossRevenue * SMART_ADJUSTMENT.expenseRatio),
  );
  const netProfit = round2(grossRevenue - estimatedExpenses);
  const marginPct = grossRevenue > 0 ? round2((netProfit / grossRevenue) * 100) : 0;

  // Output VAT on the VAT-able, VAT-inclusive UK revenue: gross − gross/1.2.
  const vatableRevenue = grossRevenue * SMART_ADJUSTMENT.vatableShare;
  const outputVat = round2(vatableRevenue - vatableRevenue / (1 + SMART_ADJUSTMENT.vatRate));

  const orderCount = report.orderCount;
  const avgOrderValue = orderCount > 0 ? round2(grossRevenue / orderCount) : 0;

  return {
    monthKey: report.monthKey,
    shortMonth: report.shortMonth,
    periodLabel: report.periodLabel,
    year: report.year,
    month: report.month,

    grossRevenue: round2(grossRevenue),
    netProfit,
    estimatedExpenses,
    marginPct,
    orderCount,
    avgOrderValue,
    outputVat,

    split,
    company: sideFigures(split.company, grossRevenue, netProfit, orderCount, outputVat, true),
    personal: sideFigures(split.personal, grossRevenue, netProfit, orderCount, outputVat, false),

    byType: report.byType,
    topBrands: report.topBrands,
    daily: report.daily,
  };
}

/** Clamp a percentage delta into the sane display band (avoids absurd values). */
export function clampDelta(pct: number): number {
  if (!Number.isFinite(pct)) return 0;
  return round2(
    Math.min(SMART_ADJUSTMENT.maxDeltaPct, Math.max(SMART_ADJUSTMENT.minDeltaPct, pct)),
  );
}

/** Month-over-month delta between two values, clamped for display. */
export function monthOverMonthDelta(current: number, previous: number): number {
  if (!previous) return current > 0 ? SMART_ADJUSTMENT.maxDeltaPct : 0;
  return clampDelta(((current - previous) / Math.abs(previous)) * 100);
}

function mergeGroupTotals(
  lists: TikTokMonthlySummary["byType"][],
): TikTokMonthlySummary["byType"] {
  const map = new Map<string, { revenue: number; orders: number }>();
  for (const list of lists) {
    for (const item of list) {
      const existing = map.get(item.name);
      if (existing) {
        existing.revenue += item.revenue;
        existing.orders += item.orders;
      } else {
        map.set(item.name, { revenue: item.revenue, orders: item.orders });
      }
    }
  }
  return [...map.entries()]
    .map(([name, data]) => ({ name, revenue: round2(data.revenue), orders: data.orders }))
    .sort((a, b) => b.revenue - a.revenue);
}

function mergeDaily(
  lists: TikTokMonthlySummary["daily"][],
): TikTokMonthlySummary["daily"] {
  const map = new Map<string, { label: string; revenue: number }>();
  for (const list of lists) {
    for (const point of list) {
      const existing = map.get(point.date);
      if (existing) existing.revenue += point.revenue;
      else map.set(point.date, { label: point.label, revenue: point.revenue });
    }
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      label: data.label,
      revenue: round2(data.revenue),
    }));
}

/** Sum multiple account-month summaries into one consolidated month. */
export function mergeMonthlySummaries(summaries: TikTokMonthlySummary[]): TikTokMonthlySummary | null {
  if (summaries.length === 0) return null;
  const first = summaries[0]!;
  if (summaries.length === 1) return first;

  const grossRevenue = round2(summaries.reduce((s, x) => s + x.grossRevenue, 0));
  const estimatedExpenses = round2(summaries.reduce((s, x) => s + x.estimatedExpenses, 0));
  const netProfit = round2(summaries.reduce((s, x) => s + x.netProfit, 0));
  const orderCount = summaries.reduce((s, x) => s + x.orderCount, 0);
  const outputVat = round2(summaries.reduce((s, x) => s + x.outputVat, 0));
  const marginPct = grossRevenue > 0 ? round2((netProfit / grossRevenue) * 100) : 0;
  const avgOrderValue = orderCount > 0 ? round2(grossRevenue / orderCount) : 0;

  const companyRevenue = round2(summaries.reduce((s, x) => s + x.company.revenue, 0));
  const personalRevenue = round2(summaries.reduce((s, x) => s + x.personal.revenue, 0));
  const companyNet = round2(summaries.reduce((s, x) => s + x.company.netProfit, 0));
  const personalNet = round2(summaries.reduce((s, x) => s + x.personal.netProfit, 0));
  const companyOrders = summaries.reduce((s, x) => s + x.company.orders, 0);
  const personalOrders = summaries.reduce((s, x) => s + x.personal.orders, 0);
  const companyVat = round2(summaries.reduce((s, x) => s + x.company.vatOnSales, 0));

  const totalSplit = companyRevenue + personalRevenue;
  const split: SplitConfig =
    totalSplit === 0
      ? first.split
      : {
          company: round2(companyRevenue / totalSplit),
          personal: round2(personalRevenue / totalSplit),
        };

  return {
    monthKey: first.monthKey,
    shortMonth: first.shortMonth,
    periodLabel: first.periodLabel,
    year: first.year,
    month: first.month,
    grossRevenue,
    netProfit,
    estimatedExpenses,
    marginPct,
    orderCount,
    avgOrderValue,
    outputVat,
    split,
    company: {
      revenue: companyRevenue,
      netProfit: companyNet,
      orders: companyOrders,
      vatOnSales: companyVat,
    },
    personal: {
      revenue: personalRevenue,
      netProfit: personalNet,
      orders: personalOrders,
      vatOnSales: 0,
    },
    byType: mergeGroupTotals(summaries.map((s) => s.byType)),
    topBrands: mergeGroupTotals(summaries.map((s) => s.topBrands)),
    daily: mergeDaily(summaries.map((s) => s.daily)),
  };
}
