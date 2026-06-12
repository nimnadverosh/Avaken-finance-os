/**
 * Domain types for the monthly TikTok Shop earnings upload feature.
 *
 * Pipeline: raw .xlsx  →  ParsedTikTokReport (faithful parse, no opinions)
 *                      →  TikTokMonthlySummary (company/personal split + smart-adjusted KPIs)
 *                      →  TikTokUploadRecord (persisted in localStorage history)
 */

/** Earnings "Type of earnings" buckets seen in the TikTok export. */
export type TikTokEarningType =
  | "Ads commissions"
  | "Affiliate commission"
  | "Cash reward from platform"
  | string; // tolerate future / unknown labels

/** A single settlement line from the report's data grid. */
export interface TikTokLineItem {
  date: string; // ISO date (YYYY-MM-DD)
  transactionId: string;
  type: TikTokEarningType;
  currency: string; // e.g. "GBP", "EUR"
  income: number; // VAT-inclusive amount settled, in the row's own currency
  expense: number; // amount deducted, in the row's own currency
  incomeGbp: number; // income normalised to GBP via FX_RATES
  payer: string; // the selling brand paying the commission
  payerCountry: string;
}

/** A name → aggregated value pair (used for brands and earning types). */
export interface TikTokGroupTotal {
  name: string;
  revenue: number; // GBP
  orders: number; // settlement lines
}

/** A single day's revenue point, used for the in-month trend chart. */
export interface TikTokDailyPoint {
  date: string; // ISO date
  label: string; // "1", "2", … day-of-month
  revenue: number; // GBP
}

/**
 * Faithful, opinion-free result of parsing one monthly report file.
 * All monetary figures are normalised to GBP.
 */
export interface ParsedTikTokReport {
  /** Period label exactly as printed in the file, e.g. "2025 Nov." */
  periodLabel: string;
  /** Normalised month key "YYYY-MM" (e.g. "2025-11"). */
  monthKey: string;
  /** 1-based calendar year/month parsed from the period label. */
  year: number;
  month: number;
  /** Short month name e.g. "Nov" — matches the dashboard's series labels. */
  shortMonth: string;
  creatorName: string;
  creatorVatNumber: string;

  grossRevenue: number; // Σ income (GBP)
  totalExpense: number; // Σ expense (GBP)
  netRevenue: number; // grossRevenue − totalExpense
  orderCount: number; // commission settlement lines (excludes platform rewards)
  lineCount: number; // every data row

  currencies: string[]; // distinct currencies encountered
  byType: TikTokGroupTotal[]; // grouped by "Type of earnings"
  topBrands: TikTokGroupTotal[]; // grouped by payer, biggest first
  daily: TikTokDailyPoint[]; // per-day revenue across the month

  /** A few representative line items, surfaced in the preview UI. */
  sampleLineItems: TikTokLineItem[];

  /** Non-fatal notes raised during parsing (FX conversion, odd rows, …). */
  warnings: string[];
}

/** Derived company vs personal attribution (automatic from report month). */
export interface SplitConfig {
  /** Fraction routed to the company, 0 or 1. */
  company: number;
  /** Fraction routed to personal, 0 or 1. Always 1 − company. */
  personal: number;
}

/** One side (company or personal) of a modelled month. */
export interface SplitFigures {
  revenue: number;
  netProfit: number;
  orders: number;
  vatOnSales: number; // output VAT (company only; 0 for personal)
}

/**
 * A fully-modelled month: the parsed report after applying the split and the
 * "smart value adjustment" rules. This is what the dashboard reads from.
 */
export interface TikTokMonthlySummary {
  monthKey: string;
  shortMonth: string;
  periodLabel: string;
  year: number;
  month: number;

  grossRevenue: number; // GBP, before split
  netProfit: number; // GBP, after estimated expenses
  estimatedExpenses: number; // GBP
  marginPct: number; // netProfit / grossRevenue * 100
  orderCount: number;
  avgOrderValue: number;
  outputVat: number; // 20% of the VAT-able (UK) revenue, VAT-inclusive basis

  split: SplitConfig;
  company: SplitFigures;
  personal: SplitFigures;

  byType: TikTokGroupTotal[];
  topBrands: TikTokGroupTotal[];
  daily: TikTokDailyPoint[];
}

/** A persisted upload (parsed report + modelled summary + provenance). */
export interface TikTokUploadRecord {
  id: string;
  /** Which registered affiliate account this report belongs to. */
  accountId: string;
  fileName: string;
  uploadedAt: string; // ISO timestamp
  split: SplitConfig;
  report: ParsedTikTokReport;
  summary: TikTokMonthlySummary;
}
