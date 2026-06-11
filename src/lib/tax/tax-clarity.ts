/**
 * Tax Clarity — a single, calm view of "what to set aside" across mixed
 * TikTok Shop income.
 *
 * Some affiliate accounts pay into Avaken Ltd (Tide business account) and are
 * therefore COMPANY income — exposed to VAT (output) and Corporation Tax on
 * profit. Other accounts pay into personal banks and are PERSONAL income —
 * taxed at the director's marginal Income Tax rate.
 *
 * The numbers here are deliberately conservative reserve *suggestions*, not
 * filed figures. Every rate is a named constant so the maths stays legible.
 */

import { tiktokAccounts, accounts } from "@/lib/data/mock";
import { currentVatPeriod, getReserves, personalTaxEstimate, vatNetDue } from "@/lib/data/queries";
import { corpTax } from "@/lib/tax/uk-corp-tax";
import type { TaxBreakdown } from "@/lib/tax/uk-income-tax";
import type { TikTokAccount } from "@/lib/data/types";

/** Affiliate `revenue` in the seed data is a monthly figure. */
const MONTHS_PER_QUARTER = 3;

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
  /** Revenue for the quarter (monthly seed × 3). */
  quarter: number;
  /** Share of total quarter revenue, 0–1. */
  share: number;
}

export interface ReserveLine {
  id: "corp" | "personal" | "vat";
  label: string;
  /** Amount we suggest setting aside this quarter. */
  amount: number;
  /** Plain-language basis for the number. */
  basis: string;
  /** Current balance already reserved for this liability (0 if none). */
  reserved: number;
  /** reserved / amount, clamped at the call site for display. */
  coverage: number;
  accent: string;
  /** Optional account this is reserved in. */
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

export function getTaxClarity(now = new Date()): TaxClarity {
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

  const companyRevenue = perAccount
    .filter((a) => a.payTo === "company")
    .reduce((s, a) => s + a.quarter, 0);
  const personalRevenue = totalRevenue - companyRevenue;

  // --- Company: Corporation Tax on profit ---
  const companyProfit = companyRevenue * COMPANY_PROFIT_MARGIN;
  // Use the tiered engine on the annualised profit to find the effective rate.
  const corpRate = corpTax(companyProfit * 4).rate;
  const corpReserve = companyProfit * corpRate;

  // --- Company: VAT (output less estimated input) ---
  const outputVat = companyRevenue * VAT_RATE;
  const vatDue = outputVat * (1 - INPUT_VAT_RATIO);

  // --- Personal: marginal Income Tax set-aside ---
  const personalReserve = personalRevenue * PERSONAL_RESERVE_RATE;

  const totalReserve = corpReserve + personalReserve + vatDue;
  const netAfterTax = totalRevenue - totalReserve;

  const vatReserveBal = accounts.find((a) => a.id === "tide-vat")?.balance ?? 0;
  const corpReserveBal = accounts.find((a) => a.id === "tide-tax")?.balance ?? 0;

  const lines: ReserveLine[] = [
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

/* ------------------------------------------------------------------ */
/*  Quick overview — one-glance "Am I safe this quarter?"              */
/* ------------------------------------------------------------------ */

export interface QuickOverview {
  quarterLabel: string;
  totalRevenue: number;
  companyRevenue: number;
  personalRevenue: number;
  totalToSetAside: number;
  vatDue: number;
  vatDaysUntilDue: number;
  personalSplit: number;
  companySplit: number;
  personalTaxEstimate: TaxBreakdown;
  reservesHeld: number;
  reservesGap: number;
  covered: boolean;
  coverageRatio: number;
  statusEmoji: "✅" | "⚠️" | "❌";
  perAccount: AccountRevenue[];
  reserveLines: ReserveLine[];
}

function calculateReserves(clarity: TaxClarity): number {
  return clarity.totalReserve;
}

export function getQuickOverview(now = new Date()): QuickOverview {
  const clarity = getTaxClarity(now);
  const reserves = calculateReserves(clarity);
  const vat = vatNetDue();
  const personal = personalTaxEstimate();

  const reserveRows = getReserves("avaken");
  const reservesHeld = reserveRows.reduce((s, r) => s + r.reserved, 0);
  const covered = reservesHeld >= reserves;
  const coverageRatio = reserves === 0 ? 1 : reservesHeld / reserves;
  const reservesGap = Math.max(0, reserves - reservesHeld);

  const statusEmoji: QuickOverview["statusEmoji"] =
    coverageRatio >= 0.95 ? "✅" : coverageRatio >= 0.5 ? "⚠️" : "❌";

  const due = new Date(currentVatPeriod().dueDate);
  const vatDaysUntilDue = Math.ceil((due.getTime() - now.getTime()) / 86400000);

  return {
    quarterLabel: clarity.quarterLabel,
    totalRevenue: clarity.totalRevenue,
    companyRevenue: clarity.companyRevenue,
    personalRevenue: clarity.personalRevenue,
    totalToSetAside: reserves,
    vatDue: vat,
    vatDaysUntilDue,
    personalSplit: clarity.personalRevenue,
    companySplit: clarity.companyRevenue,
    personalTaxEstimate: personal,
    reservesHeld,
    reservesGap,
    covered,
    coverageRatio,
    statusEmoji,
    perAccount: clarity.perAccount,
    reserveLines: clarity.lines,
  };
}
