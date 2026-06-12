/**
 * Data-driven insights for TikTok affiliate accounts — derived from uploaded reports.
 */

import type { CategorySlice, Insight } from "@/lib/data/types";
import { formatCurrency } from "@/lib/format";
import { getAffiliateAccountById } from "./accounts";
import { attributionLabel, monthOverMonthDelta } from "./model";
import { getTikTokUploads } from "./store";
import type { TikTokMonthlySummary, TikTokUploadRecord } from "./types";

export interface AffiliateMetrics {
  totalRevenue: number;
  totalNet: number;
  totalOrders: number;
  uploadCount: number;
  avgMonthlyRevenue: number;
  marginPct: number;
  bestMonth: { monthKey: string; label: string; revenue: number } | null;
  topBrand: { name: string; revenue: number; share: number; orders: number } | null;
  earningTypeMix: CategorySlice[];
  payTo: "company" | "personal";
}

export interface MonthlyInsightBundle {
  monthKey: string;
  periodLabel: string;
  shortMonth: string;
  insights: Insight[];
  metrics: {
    grossRevenue: number;
    netProfit: number;
    orderCount: number;
    marginPct: number;
    avgOrderValue: number;
    topBrand: { name: string; revenue: number; orders: number } | null;
    bestDay: { label: string; revenue: number } | null;
    byType: CategorySlice[];
    topBrands: { name: string; revenue: number; orders: number }[];
  };
}

const TYPE_COLORS: Record<string, string> = {
  "Ads commissions": "#10b981",
  "Affiliate commission": "#34d399",
  "Cash reward from platform": "#a78bfa",
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function uploadsForAccount(accountId: string): TikTokUploadRecord[] {
  return [...getTikTokUploads(accountId)].sort((a, b) =>
    b.summary.monthKey.localeCompare(a.summary.monthKey),
  );
}

function typeMix(summary: TikTokMonthlySummary): CategorySlice[] {
  const palette = ["#10b981", "#34d399", "#38bdf8", "#a78bfa", "#f59e0b"];
  return summary.byType.map((t, i) => ({
    name: t.name,
    value: t.revenue,
    color: TYPE_COLORS[t.name] ?? palette[i % palette.length]!,
  }));
}

function mergeTopBrands(uploads: TikTokUploadRecord[]) {
  const map = new Map<string, { revenue: number; orders: number }>();
  for (const u of uploads) {
    for (const b of u.summary.topBrands) {
      const existing = map.get(b.name);
      if (existing) {
        existing.revenue += b.revenue;
        existing.orders += b.orders;
      } else {
        map.set(b.name, { revenue: b.revenue, orders: b.orders });
      }
    }
  }
  return [...map.entries()]
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue);
}

function mergeEarningTypes(uploads: TikTokUploadRecord[]): CategorySlice[] {
  const map = new Map<string, number>();
  for (const u of uploads) {
    for (const t of u.summary.byType) {
      map.set(t.name, (map.get(t.name) ?? 0) + t.revenue);
    }
  }
  const palette = ["#10b981", "#34d399", "#38bdf8", "#a78bfa", "#f59e0b"];
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({
      name,
      value: round2(value),
      color: TYPE_COLORS[name] ?? palette[i % palette.length]!,
    }));
}

function insightsForMonth(
  upload: TikTokUploadRecord,
  previous: TikTokUploadRecord | null,
  accountHandle: string,
): Insight[] {
  const { summary } = upload;
  const out: Insight[] = [];
  const prefix = `${upload.accountId}-${summary.monthKey}`;

  if (previous) {
    const delta = monthOverMonthDelta(summary.grossRevenue, previous.summary.grossRevenue);
    out.push({
      id: `${prefix}-mom`,
      title: delta >= 0 ? `${summary.shortMonth} revenue up vs prior month` : `${summary.shortMonth} revenue dipped`,
      body: `${accountHandle} earned ${formatCurrency(summary.grossRevenue, { decimals: 2 })} in ${summary.periodLabel} — ${delta >= 0 ? "+" : ""}${delta}% vs ${previous.summary.shortMonth}.`,
      severity: delta >= 0 ? "positive" : "warning",
      tag: "Trend",
    });
  } else {
    out.push({
      id: `${prefix}-first`,
      title: `${summary.periodLabel} on record`,
      body: `First uploaded month for this account: ${formatCurrency(summary.grossRevenue, { decimals: 2 })} gross across ${summary.orderCount} orders.`,
      severity: "info",
      tag: "Upload",
    });
  }

  const top = summary.topBrands[0];
  if (top) {
    out.push({
      id: `${prefix}-brand`,
      title: `${top.name} led ${summary.shortMonth}`,
      body: `${formatCurrency(top.revenue, { decimals: 2 })} from ${top.orders} settlements — ${((top.revenue / Math.max(summary.grossRevenue, 0.01)) * 100).toFixed(1)}% of the month.`,
      severity: "info",
      tag: "Brands",
    });
  }

  const bestDay = [...summary.daily].sort((a, b) => b.revenue - a.revenue)[0];
  if (bestDay && bestDay.revenue > 0) {
    out.push({
      id: `${prefix}-day`,
      title: `Peak day · ${summary.shortMonth}`,
      body: `Day ${bestDay.label}: ${formatCurrency(bestDay.revenue, { decimals: 2 })} · AOV ${formatCurrency(summary.avgOrderValue, { decimals: 2 })}.`,
      severity: "positive",
      tag: "Daily",
    });
  }

  out.push({
    id: `${prefix}-attrib`,
    title: `Attributed to ${attributionLabel(summary.split)}`,
    body: `Net after estimated costs: ${formatCurrency(summary.netProfit, { decimals: 2 })} (${summary.marginPct}% margin on ${formatCurrency(summary.grossRevenue, { decimals: 0 })} gross).`,
    severity: "info",
    tag: "Tax",
  });

  return out;
}

function allTimeInsights(
  accountId: string,
  handle: string,
  uploads: TikTokUploadRecord[],
  metrics: AffiliateMetrics,
): Insight[] {
  if (uploads.length === 0) return [];
  const out: Insight[] = [];

  out.push({
    id: `${accountId}-total`,
    title: `${formatCurrency(metrics.totalRevenue, { decimals: 0 })} all-time commission`,
    body: `${handle} across ${metrics.uploadCount} uploaded month${metrics.uploadCount === 1 ? "" : "s"} · ${formatCurrency(metrics.avgMonthlyRevenue, { decimals: 0 })} avg/month · ${metrics.totalOrders.toLocaleString()} orders.`,
    severity: "positive",
    tag: "Total",
  });

  if (metrics.bestMonth) {
    out.push({
      id: `${accountId}-best`,
      title: `Best month: ${metrics.bestMonth.label}`,
      body: `${formatCurrency(metrics.bestMonth.revenue, { decimals: 2 })} gross — your strongest month on record for this account.`,
      severity: "positive",
      tag: "Peak",
    });
  }

  if (metrics.topBrand) {
    out.push({
      id: `${accountId}-topbrand`,
      title: `${metrics.topBrand.name} · top brand overall`,
      body: `${formatCurrency(metrics.topBrand.revenue, { decimals: 2 })} across all uploads (${metrics.topBrand.share.toFixed(1)}% of lifetime commission).`,
      severity: "info",
      tag: "Brands",
    });
  }

  if (uploads.length >= 2) {
    const newest = uploads[0]!;
    const oldest = uploads[uploads.length - 1]!;
    const growth = monthOverMonthDelta(newest.summary.grossRevenue, oldest.summary.grossRevenue);
    out.push({
      id: `${accountId}-trajectory`,
      title: growth >= 0 ? "Upward trajectory" : "Revenue softened over period",
      body: `From ${oldest.summary.shortMonth} to ${newest.summary.shortMonth}: ${growth >= 0 ? "+" : ""}${growth}% change in monthly gross.`,
      severity: growth >= 0 ? "positive" : "warning",
      tag: "Trend",
    });
  }

  const adsShare = metrics.earningTypeMix.find((t) => t.name === "Ads commissions");
  if (adsShare && metrics.totalRevenue > 0) {
    const pct = (adsShare.value / metrics.totalRevenue) * 100;
    out.push({
      id: `${accountId}-mix`,
      title: "Earnings mix",
      body: `Ads commissions ${pct.toFixed(0)}% of lifetime gross · ${metrics.earningTypeMix.map((t) => t.name).slice(0, 3).join(", ")}.`,
      severity: "info",
      tag: "Mix",
    });
  }

  return out;
}

export function computeAffiliateMetrics(accountId: string): AffiliateMetrics | null {
  const profile = getAffiliateAccountById(accountId);
  const uploads = uploadsForAccount(accountId);
  if (!profile || uploads.length === 0) return null;

  const totalRevenue = round2(uploads.reduce((s, u) => s + u.summary.grossRevenue, 0));
  const totalNet = round2(uploads.reduce((s, u) => s + u.summary.netProfit, 0));
  const totalOrders = uploads.reduce((s, u) => s + u.summary.orderCount, 0);
  const brands = mergeTopBrands(uploads);
  const top = brands[0];
  const bestUpload = [...uploads].sort(
    (a, b) => b.summary.grossRevenue - a.summary.grossRevenue,
  )[0]!;
  const latest = uploads[0]!;

  return {
    totalRevenue,
    totalNet,
    totalOrders,
    uploadCount: uploads.length,
    avgMonthlyRevenue: round2(totalRevenue / uploads.length),
    marginPct: totalRevenue > 0 ? round2((totalNet / totalRevenue) * 100) : 0,
    bestMonth: bestUpload
      ? {
          monthKey: bestUpload.summary.monthKey,
          label: bestUpload.summary.periodLabel,
          revenue: bestUpload.summary.grossRevenue,
        }
      : null,
    topBrand: top
      ? {
          name: top.name,
          revenue: round2(top.revenue),
          share: (top.revenue / Math.max(totalRevenue, 0.01)) * 100,
          orders: top.orders,
        }
      : null,
    earningTypeMix: mergeEarningTypes(uploads),
    payTo: latest.summary.split.company >= 1 ? "company" : profile.payTo,
  };
}

export function getAffiliateAccountInsightBundles(accountId: string): {
  handle: string;
  niche: string;
  metrics: AffiliateMetrics;
  allTime: Insight[];
  monthly: MonthlyInsightBundle[];
} | null {
  const profile = getAffiliateAccountById(accountId);
  const uploads = uploadsForAccount(accountId);
  const metrics = computeAffiliateMetrics(accountId);
  if (!profile || !metrics || uploads.length === 0) return null;

  const monthly: MonthlyInsightBundle[] = uploads.map((upload, i) => {
    const previous = uploads[i + 1] ?? null;
    const { summary } = upload;
    const top = summary.topBrands[0];
    const bestDay = [...summary.daily].sort((a, b) => b.revenue - a.revenue)[0] ?? null;

    return {
      monthKey: summary.monthKey,
      periodLabel: summary.periodLabel,
      shortMonth: summary.shortMonth,
      insights: insightsForMonth(upload, previous, profile.handle),
      metrics: {
        grossRevenue: summary.grossRevenue,
        netProfit: summary.netProfit,
        orderCount: summary.orderCount,
        marginPct: summary.marginPct,
        avgOrderValue: summary.avgOrderValue,
        topBrand: top ? { name: top.name, revenue: top.revenue, orders: top.orders } : null,
        bestDay: bestDay ? { label: bestDay.label, revenue: bestDay.revenue } : null,
        byType: typeMix(summary),
        topBrands: summary.topBrands.slice(0, 6).map((b) => ({
          name: b.name,
          revenue: b.revenue,
          orders: b.orders,
        })),
      },
    };
  });

  return {
    handle: profile.handle,
    niche: profile.niche,
    metrics,
    allTime: allTimeInsights(accountId, profile.handle, uploads, metrics),
    monthly,
  };
}

export function getAffiliatePortfolioInsights(): Insight[] {
  const uploads = getTikTokUploads();
  if (uploads.length === 0) return [];

  const accountIds = [...new Set(uploads.map((u) => u.accountId))];
  const months = [...new Set(uploads.map((u) => u.summary.monthKey))].sort();
  const totalRevenue = round2(uploads.reduce((s, u) => s + u.summary.grossRevenue, 0));
  const totalOrders = uploads.reduce((s, u) => s + u.summary.orderCount, 0);

  const out: Insight[] = [
    {
      id: "portfolio-total",
      title: `${formatCurrency(totalRevenue, { decimals: 0 })} from ${months.length} uploaded month${months.length === 1 ? "" : "s"}`,
      body: `${accountIds.length} account${accountIds.length === 1 ? "" : "s"} · ${totalOrders.toLocaleString()} orders · data from your TikTok Shop earnings exports.`,
      severity: "positive",
      tag: "Portfolio",
    },
  ];

  if (months.length >= 2) {
    const byMonth = new Map<string, number>();
    for (const u of uploads) {
      byMonth.set(u.summary.monthKey, (byMonth.get(u.summary.monthKey) ?? 0) + u.summary.grossRevenue);
    }
    const keys = [...byMonth.keys()].sort();
    const prev = byMonth.get(keys[keys.length - 2]!) ?? 0;
    const curr = byMonth.get(keys[keys.length - 1]!) ?? 0;
    const delta = monthOverMonthDelta(curr, prev);
    out.push({
      id: "portfolio-mom",
      title: delta >= 0 ? "Combined revenue trending up" : "Combined revenue dipped last month",
      body: `Latest uploaded month vs prior: ${delta >= 0 ? "+" : ""}${delta}% across all accounts.`,
      severity: delta >= 0 ? "positive" : "warning",
      tag: "Trend",
    });
  }

  const brands = mergeTopBrands(uploads);
  if (brands[0]) {
    const b = brands[0];
    out.push({
      id: "portfolio-brand",
      title: `${b.name} · #1 brand across portfolio`,
      body: `${formatCurrency(b.revenue, { decimals: 2 })} lifetime commission from this brand.`,
      severity: "info",
      tag: "Brands",
    });
  }

  return out;
}
