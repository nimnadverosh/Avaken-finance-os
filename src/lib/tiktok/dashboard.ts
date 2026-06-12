/**
 * Bridges stored TikTok uploads into the shape the dashboard query layer wants.
 *
 * Aggregates across all registered affiliate accounts. Only real uploaded months
 * are used — no mock interpolation. Company vs personal attribution follows
 * the Jul 2026 cutoff per month.
 */

import type { CategorySlice, Entity, Insight, SeriesPoint, TikTokAccount } from "@/lib/data/types";
import { formatCurrency } from "@/lib/format";
import { getAffiliateAccounts, getAffiliateAccountById } from "./accounts";
import {
  SMART_ADJUSTMENT,
  attributionLabel,
  clampDelta,
  mergeMonthlySummaries,
  monthOverMonthDelta,
} from "./model";
import { getTikTokUploads } from "./store";
import type { TikTokMonthlySummary, TikTokUploadRecord } from "./types";

const TYPE_COLORS: Record<string, string> = {
  "Ads commissions": "#10b981",
  "Affiliate commission": "#34d399",
  "Cash reward from platform": "#a78bfa",
};

export interface TikTokTrailingPoint {
  label: string;
  monthKey: string;
  gross: number;
  company: number;
  personal: number;
  isReal: true;
}

export interface TikTokDashboardModel {
  latest: TikTokMonthlySummary;
  previous: TikTokMonthlySummary | null;
  /** Chronological series — one point per calendar month (summed across accounts). */
  series: TikTokTrailingPoint[];
  uploadCount: number;
  accountCount: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Group uploads by calendar month and merge summaries across accounts. */
function aggregateByMonth(uploads: TikTokUploadRecord[]): TikTokMonthlySummary[] {
  const byMonth = new Map<string, TikTokUploadRecord[]>();
  for (const u of uploads) {
    const list = byMonth.get(u.summary.monthKey) ?? [];
    list.push(u);
    byMonth.set(u.summary.monthKey, list);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, records]) => mergeMonthlySummaries(records.map((r) => r.summary))!)
    .filter(Boolean);
}

function buildUploadSeries(summaries: TikTokMonthlySummary[]): TikTokTrailingPoint[] {
  return summaries.map((s) => ({
    label: s.shortMonth,
    monthKey: s.monthKey,
    gross: s.grossRevenue,
    company: s.company.revenue,
    personal: s.personal.revenue,
    isReal: true as const,
  }));
}

/** The current dashboard model, or null when no reports have been uploaded. */
export function getTikTokDashboardModel(): TikTokDashboardModel | null {
  const uploads = getTikTokUploads();
  if (uploads.length === 0) return null;

  const months = aggregateByMonth(uploads);
  const accountIds = new Set(uploads.map((u) => u.accountId));

  return {
    latest: months[months.length - 1]!,
    previous: months.length > 1 ? months[months.length - 2]! : null,
    series: buildUploadSeries(months),
    uploadCount: uploads.length,
    accountCount: accountIds.size,
  };
}

/** Entity-specific revenue for the latest uploaded month. */
export function tiktokLatestRevenue(
  model: TikTokDashboardModel,
  entity: "avaken" | "personal" | "consolidated",
): number {
  const { latest } = model;
  if (entity === "avaken") return latest.company.revenue;
  if (entity === "personal") return latest.personal.revenue;
  return latest.grossRevenue;
}

/** Entity-specific net profit for the latest uploaded month. */
export function tiktokLatestNet(
  model: TikTokDashboardModel,
  entity: "avaken" | "personal" | "consolidated",
): number {
  const { latest } = model;
  if (entity === "avaken") return latest.company.netProfit;
  if (entity === "personal") return latest.personal.netProfit;
  return latest.netProfit;
}

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

export function tiktokCashflowSeries(
  model: TikTokDashboardModel,
  entity: "avaken" | "personal" | "consolidated",
): SeriesPoint[] {
  return tiktokRevenueSeries(model, entity).map((p) => ({
    label: p.label,
    inflow: p.revenue!,
    outflow: -p.expenses!,
  }));
}

export function tiktokExpenseBreakdown(model: TikTokDashboardModel): CategorySlice[] {
  const palette = ["#10b981", "#34d399", "#38bdf8", "#a78bfa", "#f59e0b", "#f43f5e"];
  return model.latest.byType.map((t, i) => ({
    name: t.name,
    value: t.revenue,
    color: TYPE_COLORS[t.name] ?? palette[i % palette.length],
  }));
}

/**
 * Map registered affiliate accounts to dashboard rows using their latest upload.
 * Returns empty when no accounts are registered.
 */
export function tiktokAffiliatesFromAccounts(): TikTokAccount[] {
  const profiles = getAffiliateAccounts();
  if (profiles.length === 0) return [];

  return profiles.map((profile) => {
    const accountUploads = getTikTokUploads(profile.id);
    const latest = accountUploads[0]?.summary;
    const previous = accountUploads[1]?.summary;

    if (!latest) {
      return {
        id: profile.id,
        handle: profile.handle,
        niche: profile.niche,
        followers: 0,
        revenue: 0,
        commission: 0,
        orders: 0,
        conversion: 0,
        status: "stable" as const,
        spark: [0, 0, 0],
        delta: 0,
        payTo: profile.payTo,
      };
    }

    const delta = previous
      ? monthOverMonthDelta(latest.grossRevenue, previous.grossRevenue)
      : 0;

    let status: TikTokAccount["status"] = "stable";
    if (delta >= 15) status = "scaling";
    else if (delta <= -8) status = "at-risk";
    else if (delta >= 5) status = "warming";

    const dailySpark = latest.daily.slice(-7).map((d) => d.revenue);
    const spark =
      dailySpark.length >= 2
        ? dailySpark
        : previous
          ? [previous.grossRevenue * 0.85, previous.grossRevenue * 0.92, latest.grossRevenue]
          : [latest.grossRevenue * 0.8, latest.grossRevenue * 0.9, latest.grossRevenue];

    const payTo =
      latest.split.company >= 1 ? ("company" as const) : profile.payTo;

    return {
      id: profile.id,
      handle: profile.handle,
      niche: profile.niche,
      followers: 0,
      revenue: round2(latest.grossRevenue),
      commission: latest.marginPct,
      orders: latest.orderCount,
      conversion:
        latest.orderCount > 0
          ? round2((latest.topBrands[0]?.orders ?? latest.orderCount) / latest.orderCount * 100)
          : 0,
      status,
      spark,
      delta: clampDelta(delta),
      payTo,
    };
  }).sort((a, b) => b.revenue - a.revenue);
}

/** @deprecated Use tiktokAffiliatesFromAccounts — kept for internal reference. */
export function tiktokAffiliatesFromUpload(model: TikTokDashboardModel): TikTokAccount[] {
  void model;
  return tiktokAffiliatesFromAccounts();
}

export function tiktokTotalRevenue(
  model: TikTokDashboardModel,
  entity: "avaken" | "personal" | "consolidated",
): number {
  return round2(
    model.series.reduce((sum, p) => {
      if (entity === "avaken") return sum + p.company;
      if (entity === "personal") return sum + p.personal;
      return sum + p.gross;
    }, 0),
  );
}

export function tiktokUploadsInQuarter(now = new Date()): TikTokUploadRecord[] {
  const q = Math.floor(now.getMonth() / 3);
  const year = now.getFullYear();
  return getTikTokUploads().filter((u) => {
    const monthIdx = u.summary.month - 1;
    return u.summary.year === year && Math.floor(monthIdx / 3) === q;
  });
}

export function tiktokInsights(model: TikTokDashboardModel, entity: Entity = "consolidated"): Insight[] {
  const { latest, previous, accountCount } = model;
  const out: Insight[] = [];
  const attributedTo = attributionLabel(latest.split);

  if (previous) {
    const delta = monthOverMonthDelta(latest.grossRevenue, previous.grossRevenue);
    out.push({
      id: `tt-mom-${latest.monthKey}`,
      title: delta >= 0 ? "TikTok revenue is up MoM" : "TikTok revenue dipped MoM",
      body: `${latest.shortMonth} commission came in at ${formatCurrency(latest.grossRevenue, { decimals: 2 })} across ${accountCount} account${accountCount === 1 ? "" : "s"} — ${delta >= 0 ? "+" : ""}${delta}% vs ${previous.shortMonth}. Attributed to ${attributedTo}.`,
      severity: delta >= 0 ? "positive" : "warning",
      tag: "Affiliates",
    });
  } else {
    out.push({
      id: `tt-first-${latest.monthKey}`,
      title: `${latest.periodLabel} uploaded`,
      body: `${formatCurrency(latest.grossRevenue, { decimals: 2 })} gross commission across ${latest.orderCount} orders — attributed to ${attributedTo}. Upload earlier months to build your history.`,
      severity: "info",
      tag: "Affiliates",
    });
  }

  const topBrand = latest.topBrands[0];
  if (topBrand) {
    out.push({
      id: `tt-brand-${latest.monthKey}`,
      title: `${topBrand.name} is your top earner`,
      body: `${topBrand.name} drove ${formatCurrency(topBrand.revenue, { decimals: 2 })} across ${topBrand.orders} settlement${topBrand.orders === 1 ? "" : "s"} — ${((topBrand.revenue / Math.max(latest.grossRevenue, 0.01)) * 100).toFixed(1)}% of the month.`,
      severity: "info",
      tag: "Affiliates",
    });
  }

  if (latest.split.company >= 1 && entity !== "personal") {
    out.push({
      id: `tt-vat-${latest.monthKey}`,
      title: "Output VAT set aside from commission",
      body: `${formatCurrency(latest.company.vatOnSales, { decimals: 2 })} output VAT on ${latest.shortMonth} company commission. Net after estimated costs: ${formatCurrency(latest.netProfit, { decimals: 2 })}.`,
      severity: "info",
      tag: "VAT",
    });
  }

  if (entity !== "avaken") {
    out.push({
      id: `tt-personal-${latest.monthKey}`,
      title: `Personal TikTok income · ${latest.shortMonth}`,
      body: `${formatCurrency(latest.personal.revenue, { decimals: 2 })} attributed to personal (${latest.personal.orders} orders). Set aside ~40% for Income Tax if you're in the higher band.`,
      severity: "info",
      tag: "Tax",
    });
  }

  const bestDay = [...latest.daily].sort((a, b) => b.revenue - a.revenue)[0];
  if (bestDay) {
    out.push({
      id: `tt-bestday-${latest.monthKey}`,
      title: "Best trading day this month",
      body: `Day ${bestDay.label}: ${formatCurrency(bestDay.revenue, { decimals: 2 })} · AOV ${formatCurrency(latest.avgOrderValue, { decimals: 2 })} across ${latest.orderCount} orders.`,
      severity: "positive",
      tag: "Affiliates",
    });
  }

  return out;
}

/** Label for an upload's account in history rows. */
export function affiliateLabelForUpload(upload: TikTokUploadRecord): string {
  return getAffiliateAccountById(upload.accountId)?.handle ?? upload.report.creatorName ?? "Unknown";
}
