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
