/**
 * Bridges stored TikTok uploads into the shape the dashboard query layer wants.
 *
 * Everything here is pure and derived from the store; it never mutates state.
 * The headline job is `buildTrailingSeries`, which anchors a smooth, realistic
 * trailing-12-month revenue curve on the real uploaded months (the core of the
 * "smart value adjustment" requirement) so charts never show a broken spike.
 */

import type { Insight, SeriesPoint, TikTokAccount } from "@/lib/data/types";
import { tiktokAccounts } from "@/lib/data/mock";
import { formatCurrency } from "@/lib/format";
import { SMART_ADJUSTMENT, clampDelta, monthOverMonthDelta } from "./model";
import { getSplitConfig, getTikTokUploads } from "./store";
import type { SplitConfig, TikTokMonthlySummary } from "./types";

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Synthesised filler months grow within this MoM band so they stay believable. */
const SYNTH_GROWTH_MIN = 0.03;
const SYNTH_GROWTH_MAX = 0.3;

export interface TikTokTrailingPoint {
  label: string; // short month, e.g. "Nov"
  monthKey: string; // "2025-11"
  gross: number; // GBP, all TikTok revenue that month
  company: number; // company split
  personal: number; // personal split
  isReal: boolean; // true if backed by an actual upload
}

export interface TikTokDashboardModel {
  latest: TikTokMonthlySummary;
  previous: TikTokMonthlySummary | null;
  split: SplitConfig;
  series: TikTokTrailingPoint[];
  uploadCount: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Derive a sane MoM growth ratio from the known anchors. */
function deriveGrowth(anchors: { index: number; gross: number }[]): number {
  if (anchors.length < 2) return 0.08;
  const first = anchors[0];
  const last = anchors[anchors.length - 1];
  const span = last.index - first.index;
  if (span <= 0 || first.gross <= 0) return 0.08;
  const ratio = Math.pow(last.gross / first.gross, 1 / span) - 1;
  return Math.min(SYNTH_GROWTH_MAX, Math.max(SYNTH_GROWTH_MIN, ratio));
}

/**
 * Build a trailing-12-month series ending on the latest uploaded month.
 * Real months use their true totals; gaps are interpolated, and months before
 * the earliest upload are back-projected using a clamped growth rate.
 */
function buildTrailingSeries(
  uploads: { summary: TikTokMonthlySummary }[],
  split: SplitConfig,
): TikTokTrailingPoint[] {
  const latest = uploads[0].summary;
  const known = new Map<string, number>();
  uploads.forEach((u) => known.set(u.summary.monthKey, u.summary.grossRevenue));

  // The 12 calendar months ending at the latest uploaded month.
  const window: { monthKey: string; label: string }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(latest.year, latest.month - 1 - i, 1));
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    window.push({ monthKey: `${y}-${String(m).padStart(2, "0")}`, label: SHORT_MONTHS[m - 1] });
  }

  const anchors = window
    .map((w, index) => ({ index, gross: known.get(w.monthKey) }))
    .filter((a): a is { index: number; gross: number } => a.gross !== undefined);
  const growth = deriveGrowth(anchors);

  const grossByIndex: number[] = window.map((w, index) => {
    const real = known.get(w.monthKey);
    if (real !== undefined) return real;

    const before = [...anchors].reverse().find((a) => a.index < index);
    const after = anchors.find((a) => a.index > index);

    if (before && after) {
      // Linear interpolation between two real anchors.
      const t = (index - before.index) / (after.index - before.index);
      return before.gross + (after.gross - before.gross) * t;
    }
    if (after) {
      // Back-project below the earliest known month.
      return after.gross / Math.pow(1 + growth, after.index - index);
    }
    if (before) {
      // Forward-project beyond the latest known month.
      return before.gross * Math.pow(1 + growth, index - before.index);
    }
    return 0;
  });

  return window.map((w, index) => {
    const gross = round2(Math.max(0, grossByIndex[index]));
    return {
      label: w.label,
      monthKey: w.monthKey,
      gross,
      company: round2(gross * split.company),
      personal: round2(gross * split.personal),
      isReal: known.has(w.monthKey),
    };
  });
}

/** The current dashboard model, or null when no reports have been uploaded. */
export function getTikTokDashboardModel(): TikTokDashboardModel | null {
  const uploads = getTikTokUploads();
  if (uploads.length === 0) return null;
  const split = getSplitConfig();
  return {
    latest: uploads[0].summary,
    previous: uploads[1]?.summary ?? null,
    split,
    series: buildTrailingSeries(uploads, split),
    uploadCount: uploads.length,
  };
}

/**
 * Convert a trailing series into the dashboard's revenue/net SeriesPoint shape
 * for a given entity, applying the realistic expense ratio to derive net.
 */
export function tiktokRevenueSeries(
  model: TikTokDashboardModel,
  entity: "avaken" | "personal" | "consolidated",
): SeriesPoint[] {
  return model.series.map((p) => {
    const revenue =
      entity === "avaken" ? p.company : entity === "personal" ? p.personal : p.gross;
    const expenses = round2(
      Math.max(SMART_ADJUSTMENT.minMonthlyExpense * 0.4, revenue * SMART_ADJUSTMENT.expenseRatio),
    );
    return { label: p.label, revenue, expenses, net: round2(revenue - expenses) };
  });
}

/**
 * Rescale the six seed TikTok accounts so their combined revenue equals the
 * company's actual commission for the latest month — preserving the rich
 * leaderboard UI (followers, conversion, sparklines) while showing real totals.
 */
export function tiktokScaledAffiliates(model: TikTokDashboardModel): TikTokAccount[] {
  const target = model.latest.company.revenue;
  const seedTotal = tiktokAccounts.reduce((sum, a) => sum + a.revenue, 0);
  const factor = seedTotal > 0 ? target / seedTotal : 0;
  const overallDelta = model.previous
    ? monthOverMonthDelta(model.latest.company.revenue, model.previous.company.revenue)
    : 0;

  return tiktokAccounts.map((a) => {
    const revenue = round2(a.revenue * factor);
    return {
      ...a,
      revenue,
      orders: Math.max(1, Math.round(a.orders * factor)),
      // Nudge each account's own delta toward the real overall movement.
      delta: clampDelta((a.delta + overallDelta) / 2),
      spark: a.spark.map((v) => round2(v * factor)),
    };
  });
}

/** Generate data-driven insights from the latest upload. */
export function tiktokInsights(model: TikTokDashboardModel): Insight[] {
  const { latest, previous } = model;
  const out: Insight[] = [];

  if (previous) {
    const delta = monthOverMonthDelta(latest.grossRevenue, previous.grossRevenue);
    out.push({
      id: `tt-mom-${latest.monthKey}`,
      title: delta >= 0 ? "TikTok revenue is up MoM" : "TikTok revenue dipped MoM",
      body: `${latest.shortMonth} commission came in at ${formatCurrency(latest.grossRevenue, { decimals: 2 })} — ${delta >= 0 ? "+" : ""}${delta}% vs ${previous.shortMonth}. Company share ${formatCurrency(latest.company.revenue, { decimals: 2 })}, personal ${formatCurrency(latest.personal.revenue, { decimals: 2 })}.`,
      severity: delta >= 0 ? "positive" : "warning",
      tag: "Affiliates",
    });
  }

  const topBrand = latest.topBrands[0];
  if (topBrand) {
    out.push({
      id: `tt-brand-${latest.monthKey}`,
      title: `${topBrand.name} is your top earner`,
      body: `${topBrand.name} drove ${formatCurrency(topBrand.revenue, { decimals: 2 })} across ${topBrand.orders} settlement${topBrand.orders === 1 ? "" : "s"} this month — ${((topBrand.revenue / Math.max(latest.grossRevenue, 0.01)) * 100).toFixed(1)}% of total commission.`,
      severity: "info",
      tag: "Affiliates",
    });
  }

  out.push({
    id: `tt-vat-${latest.monthKey}`,
    title: "Output VAT set aside from commission",
    body: `${formatCurrency(latest.outputVat, { decimals: 2 })} of ${latest.shortMonth}'s commission is output VAT (20% on the UK-able portion). Net profit after estimated costs is ${formatCurrency(latest.netProfit, { decimals: 2 })} (${latest.marginPct}% margin).`,
    severity: "info",
    tag: "VAT",
  });

  const bestDay = [...latest.daily].sort((a, b) => b.revenue - a.revenue)[0];
  if (bestDay) {
    out.push({
      id: `tt-bestday-${latest.monthKey}`,
      title: "Best trading day this month",
      body: `Day ${bestDay.label} brought in ${formatCurrency(bestDay.revenue, { decimals: 2 })} from ${latest.orderCount} orders across the month (AOV ${formatCurrency(latest.avgOrderValue, { decimals: 2 })}).`,
      severity: "positive",
      tag: "Affiliates",
    });
  }

  return out;
}
