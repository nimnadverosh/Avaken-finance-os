/**
 * Tax Clarity — a single, calm view of "what to set aside" across mixed
 * TikTok Shop income.
 *
 * When monthly TikTok reports have been uploaded, all revenue figures come from
 * those real uploads (with automatic Jul 2026 company / pre-Jul personal
 * attribution). Otherwise falls back to seed data for demo mode.
 */

import { isRealDataMode } from "@/lib/data/real-data-mode";
import { accounts, tiktokAccounts } from "@/lib/data/mock";
import { corpTax } from "@/lib/tax/uk-corp-tax";
import type { TikTokAccount } from "@/lib/data/types";
import {
  getTikTokDashboardModel,
  tiktokAffiliatesFromAccounts,
  tiktokUploadsInQuarter,
} from "@/lib/tiktok/dashboard";
import { hasAffiliateAccounts } from "@/lib/tiktok/accounts";
import { getTikTokUploads } from "@/lib/tiktok/store";

/** Net-profit margin assumed on company affiliate turnover (after ad spend, tools, fees). */
export const COMPANY_PROFIT_MARGIN = 0.72;

/** Marginal set-aside rate for personal affiliate income (director already in the higher band). */
export const PERSONAL_RESERVE_RATE = 0.4;

/** UK standard VAT rate — Avaken Ltd is VAT registered, so company sales carry output VAT. */
export const VAT_RATE = 0.2;

/** Estimated input VAT recoverable, as a share of output VAT (proxy for VAT on costs). */
const INPUT_VAT_RATIO = 0.18;

export interface AccountRevenue {
  id: string;
  handle: string;
  niche: string;
  payTo: TikTokAccount["payTo"];
  quarter: number;
  share: number;
}

export interface ReserveLine {
  id: "corp" | "personal" | "vat";
  label: string;
  amount: number;
  basis: string;
  reserved: number;
  coverage: number;
  accent: string;
  accountName?: string;
}

export interface TaxClarity {
  quarterLabel: string;
  totalRevenue: number;
  companyRevenue: number;
  personalRevenue: number;
  companyProfit: number;
  perAccount: AccountRevenue[];
  corpReserve: number;
  corpRate: number;
  personalReserve: number;
  vatDue: number;
  totalReserve: number;
  netAfterTax: number;
  lines: ReserveLine[];
}

function ukQuarterLabel(now = new Date()): string {
  const q = Math.floor(now.getMonth() / 3) + 1;
  return `Q${q} ${now.getFullYear()}`;
}

function fromUploads(now = new Date()): Omit<TaxClarity, "lines"> & { linesInputs: { corpReserveBal: number; vatReserveBal: number } } | null {
  const model = getTikTokDashboardModel();
  if (!model) return null;

  const inQuarter = tiktokUploadsInQuarter(now);
  const source = getTikTokUploads();
  const periodLabel =
    inQuarter.length > 0 ? ukQuarterLabel(now) : `${model.latest.periodLabel} + prior uploads`;

  let companyRevenue = 0;
  let personalRevenue = 0;

  for (const upload of source) {
    companyRevenue += upload.summary.company.revenue;
    personalRevenue += upload.summary.personal.revenue;
  }

  const totalRevenue = companyRevenue + personalRevenue;
  const affiliates = tiktokAffiliatesFromAccounts({ period: "all" });
  const perAccount: AccountRevenue[] = affiliates
    .filter((a) => (a.totalRevenue ?? a.revenue) > 0)
    .map((a) => ({
      id: a.id,
      handle: a.handle,
      niche: a.niche,
      payTo: a.payTo,
      quarter: a.totalRevenue ?? a.revenue,
      share: totalRevenue === 0 ? 0 : (a.totalRevenue ?? a.revenue) / totalRevenue,
    }))
    .sort((a, b) => b.quarter - a.quarter);

  const companyProfit = companyRevenue * COMPANY_PROFIT_MARGIN;
  const corpRate = corpTax(companyProfit * 4).rate;
  const corpReserve = companyProfit * corpRate;

  const outputVat = companyRevenue * VAT_RATE;
  const vatDue = outputVat * (1 - INPUT_VAT_RATIO);
  const personalReserve = personalRevenue * PERSONAL_RESERVE_RATE;
  const totalReserve = corpReserve + personalReserve + vatDue;
  const netAfterTax = totalRevenue - totalReserve;

  return {
    quarterLabel: periodLabel,
    totalRevenue,
    companyRevenue,
    personalRevenue,
    companyProfit,
    perAccount,
    corpReserve,
    corpRate,
    personalReserve,
    vatDue,
    totalReserve,
    netAfterTax,
    linesInputs: {
      vatReserveBal: accounts.find((a) => a.id === "tide-vat")?.balance ?? 0,
      corpReserveBal: accounts.find((a) => a.id === "tide-tax")?.balance ?? 0,
    },
  };
}

function buildLines(
  corpReserve: number,
  corpRate: number,
  companyProfit: number,
  vatDue: number,
  personalReserve: number,
  corpReserveBal: number,
  vatReserveBal: number,
): ReserveLine[] {
  return [
    {
      id: "corp",
      label: "Corporation Tax Reserve",
      amount: corpReserve,
      basis: `${Math.round(corpRate * 100)}% on £${Math.round(companyProfit).toLocaleString()} company profit`,
      reserved: corpReserveBal,
      coverage: corpReserve === 0 ? 1 : corpReserveBal / corpReserve,
      accent: "#a78bfa",
      accountName: "Tide · Corp Tax Reserve",
    },
    {
      id: "vat",
      label: "VAT Due",
      amount: vatDue,
      basis: `20% output VAT on company sales, less ~${Math.round(INPUT_VAT_RATIO * 100)}% reclaimable`,
      reserved: vatReserveBal,
      coverage: vatDue === 0 ? 1 : vatReserveBal / vatDue,
      accent: "#f59e0b",
      accountName: "Tide · VAT Reserve",
    },
    {
      id: "personal",
      label: "Personal Tax Reserve",
      amount: personalReserve,
      basis: `${Math.round(PERSONAL_RESERVE_RATE * 100)}% set-aside on personal-bank income`,
      reserved: 0,
      coverage: 0,
      accent: "#38bdf8",
    },
  ];
}

export function getTaxClarity(now = new Date()): TaxClarity {
  const fromReal = fromUploads(now);
  if (fromReal) {
    const lines = buildLines(
      fromReal.corpReserve,
      fromReal.corpRate,
      fromReal.companyProfit,
      fromReal.vatDue,
      fromReal.personalReserve,
      fromReal.linesInputs.corpReserveBal,
      fromReal.linesInputs.vatReserveBal,
    );
    return { ...fromReal, lines };
  }

  // Demo fallback when no uploads yet and not in real-data mode
  if (!hasAffiliateAccounts() && !isRealDataMode()) {
    const MONTHS_PER_QUARTER = 3;
    const perAccountRaw = tiktokAccounts.map((a) => ({
      id: a.id,
      handle: a.handle,
      niche: a.niche,
      payTo: a.payTo,
      quarter: a.revenue * MONTHS_PER_QUARTER,
    }));

    const totalRevenue = perAccountRaw.reduce((s, a) => s + a.quarter, 0);
    const perAccount: AccountRevenue[] = perAccountRaw
      .map((a) => ({ ...a, share: totalRevenue === 0 ? 0 : a.quarter / totalRevenue }))
      .sort((a, b) => b.quarter - a.quarter);

    const companyRevenue = perAccount.filter((a) => a.payTo === "company").reduce((s, a) => s + a.quarter, 0);
    const personalRevenue = totalRevenue - companyRevenue;
    const companyProfit = companyRevenue * COMPANY_PROFIT_MARGIN;
    const corpRate = corpTax(companyProfit * 4).rate;
    const corpReserve = companyProfit * corpRate;
    const outputVat = companyRevenue * VAT_RATE;
    const vatDue = outputVat * (1 - INPUT_VAT_RATIO);
    const personalReserve = personalRevenue * PERSONAL_RESERVE_RATE;
    const totalReserve = corpReserve + personalReserve + vatDue;
    const netAfterTax = totalRevenue - totalReserve;

    const lines = buildLines(
      corpReserve,
      corpRate,
      companyProfit,
      vatDue,
      personalReserve,
      accounts.find((a) => a.id === "tide-tax")?.balance ?? 0,
      accounts.find((a) => a.id === "tide-vat")?.balance ?? 0,
    );

    return {
      quarterLabel: ukQuarterLabel(now),
      totalRevenue,
      companyRevenue,
      personalRevenue,
      companyProfit,
      perAccount,
      corpReserve,
      corpRate,
      personalReserve,
      vatDue,
      totalReserve,
      netAfterTax,
      lines,
    };
  }

  // Accounts exist but no uploads yet — return zeroed clarity
  const lines = buildLines(0, 0, 0, 0, 0, 0, 0);
  return {
    quarterLabel: ukQuarterLabel(now),
    totalRevenue: 0,
    companyRevenue: 0,
    personalRevenue: 0,
    companyProfit: 0,
    perAccount: tiktokAffiliatesFromAccounts().map((a) => ({
      id: a.id,
      handle: a.handle,
      niche: a.niche,
      payTo: a.payTo,
      quarter: 0,
      share: 0,
    })),
    corpReserve: 0,
    corpRate: 0,
    personalReserve: 0,
    vatDue: 0,
    totalReserve: 0,
    netAfterTax: 0,
    lines,
  };
}
