/**
 * Period filtering for TikTok upload metrics — powers dashboard KPIs and affiliates.
 */

import type { Entity } from "@/lib/data/types";
import type { TikTokUploadRecord } from "./types";
import { getTikTokUploads } from "./store";

export type TikTokViewPeriod = "latest" | "month" | "qtd" | "ytd" | "all";

export interface TikTokPeriodSelection {
  period: TikTokViewPeriod;
  /** Required when period === "month" — e.g. "2025-11". */
  monthKey?: string;
}

export interface UploadedMonthOption {
  monthKey: string;
  label: string;
  shortMonth: string;
}

function entityRevenue(
  summary: TikTokUploadRecord["summary"],
  entity: "avaken" | "personal" | "consolidated",
): number {
  if (entity === "avaken") return summary.company.revenue;
  if (entity === "personal") return summary.personal.revenue;
  return summary.grossRevenue;
}

function entityNet(
  summary: TikTokUploadRecord["summary"],
  entity: "avaken" | "personal" | "consolidated",
): number {
  if (entity === "avaken") return summary.company.netProfit;
  if (entity === "personal") return summary.personal.netProfit;
  return summary.netProfit;
}

/** Distinct uploaded months, newest first. */
export function listUploadedMonths(accountId?: string): UploadedMonthOption[] {
  const seen = new Map<string, UploadedMonthOption>();
  for (const u of getTikTokUploads(accountId)) {
    if (!seen.has(u.summary.monthKey)) {
      seen.set(u.summary.monthKey, {
        monthKey: u.summary.monthKey,
        label: u.summary.periodLabel,
        shortMonth: u.summary.shortMonth,
      });
    }
  }
  return [...seen.values()].sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}

export function filterUploadsByPeriod(
  uploads: TikTokUploadRecord[],
  selection: TikTokPeriodSelection,
  now = new Date(),
): TikTokUploadRecord[] {
  if (uploads.length === 0) return [];

  switch (selection.period) {
    case "all":
      return uploads;

    case "latest": {
      const latestKey = [...uploads]
        .sort((a, b) => b.summary.monthKey.localeCompare(a.summary.monthKey))[0]!
        .summary.monthKey;
      return uploads.filter((u) => u.summary.monthKey === latestKey);
    }

    case "month": {
      if (!selection.monthKey) return [];
      return uploads.filter((u) => u.summary.monthKey === selection.monthKey);
    }

    case "qtd": {
      const q = Math.floor(now.getMonth() / 3);
      const year = now.getFullYear();
      return uploads.filter((u) => {
        const monthIdx = u.summary.month - 1;
        return u.summary.year === year && Math.floor(monthIdx / 3) === q;
      });
    }

    case "ytd":
      return uploads.filter((u) => u.summary.year === now.getFullYear());

    default:
      return uploads;
  }
}

export function getFilteredUploads(
  selection: TikTokPeriodSelection,
  accountId?: string,
  now = new Date(),
): TikTokUploadRecord[] {
  return filterUploadsByPeriod(getTikTokUploads(accountId), selection, now);
}

export function sumUploadRevenue(
  uploads: TikTokUploadRecord[],
  entity: "avaken" | "personal" | "consolidated",
): number {
  return Math.round(uploads.reduce((s, u) => s + entityRevenue(u.summary, entity), 0) * 100) / 100;
}

export function sumUploadNet(
  uploads: TikTokUploadRecord[],
  entity: "avaken" | "personal" | "consolidated",
): number {
  return Math.round(uploads.reduce((s, u) => s + entityNet(u.summary, entity), 0) * 100) / 100;
}

export function sumUploadOrders(uploads: TikTokUploadRecord[]): number {
  return uploads.reduce((s, u) => s + u.summary.orderCount, 0);
}

/** Human label for the active period selection. */
export function periodLabel(selection: TikTokPeriodSelection, now = new Date()): string {
  switch (selection.period) {
    case "latest":
      return "Latest month";
    case "month": {
      const m = listUploadedMonths().find((x) => x.monthKey === selection.monthKey);
      return m?.label ?? "Selected month";
    }
    case "qtd": {
      const q = Math.floor(now.getMonth() / 3) + 1;
      return `Q${q} ${now.getFullYear()}`;
    }
    case "ytd":
      return `YTD ${now.getFullYear()}`;
    case "all":
      return "All uploads";
    default:
      return "";
  }
}

/** Monthly spark data for an account — one point per uploaded month. */
export function monthlySparkForAccount(
  accountId: string,
  entity: Entity = "consolidated",
): number[] {
  const e = entity === "consolidated" ? "consolidated" : entity;
  const byMonth = new Map<string, number>();
  for (const u of getTikTokUploads(accountId)) {
    const rev = entityRevenue(u.summary, e);
    byMonth.set(u.summary.monthKey, (byMonth.get(u.summary.monthKey) ?? 0) + rev);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
}

export function periodDelta(
  uploads: TikTokUploadRecord[],
  entity: "avaken" | "personal" | "consolidated",
): number {
  const byMonth = new Map<string, number>();
  for (const u of uploads) {
    byMonth.set(
      u.summary.monthKey,
      (byMonth.get(u.summary.monthKey) ?? 0) + entityRevenue(u.summary, entity),
    );
  }
  const keys = [...byMonth.keys()].sort();
  if (keys.length < 2) return 0;
  const prev = byMonth.get(keys[keys.length - 2]!) ?? 0;
  const curr = byMonth.get(keys[keys.length - 1]!) ?? 0;
  if (!prev) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / Math.abs(prev)) * 1000) / 10;
}
