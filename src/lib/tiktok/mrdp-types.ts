/**
 * Types for TikTok Shop MRDP (Marketplace Reporting for DAC7) annual tax reports.
 *
 * MRDP workbooks contain a summary sheet plus quarterly consideration detail
 * sheets with individual order/adjustment line items.
 */

export type MrdpQuarter = "Q1" | "Q2" | "Q3" | "Q4";

export type MrdpEntityChoice = "personal" | "avaken";

export type MrdpAssignmentMode = "all-personal" | "all-avaken" | "per-quarter";

/** A single order/adjustment line from a quarterly detail sheet. */
export interface MrdpTransaction {
  orderId: string;
  amount: number; // GBP
}

/** Aggregated figures for one calendar quarter. */
export interface MrdpQuarterSummary {
  quarter: MrdpQuarter;
  quarterIndex: number; // 1–4
  revenue: number; // GBP consideration (net of fees/taxes withheld)
  feesWithheld: number;
  taxes: number;
  transactionCount: number;
  transactions: MrdpTransaction[];
}

/** Faithful parse of one MRDP annual workbook. */
export interface ParsedMrdpReport {
  /** Tax year the report covers, e.g. 2025 */
  year: number;
  fileName: string;

  /** Creator / seller metadata from the summary sheet */
  creatorId: string;
  creatorName: string;
  creatorType: "Individual" | "Entity" | string;
  residenceCountry: string;
  tin: string;
  vatNumber: string;
  relevantActivities: string;
  currency: string;

  /** Quarterly breakdown */
  quarters: MrdpQuarterSummary[];

  /** Roll-up totals */
  totalRevenue: number;
  totalTransactions: number;

  warnings: string[];
}

/** User's entity assignment choices at import time. */
export interface MrdpEntityAssignment {
  mode: MrdpAssignmentMode;
  /** Per-quarter entity when mode is "per-quarter" */
  quarters: Record<MrdpQuarter, MrdpEntityChoice>;
}

/** Result returned after a successful MRDP import. */
export interface MrdpImportResult {
  year: number;
  monthsImported: number;
  totalRevenue: number;
  totalTransactions: number;
  companyRevenue: number;
  personalRevenue: number;
  corpTaxReserve: number;
  vatReserve: number;
  personalTaxReserve: number;
  totalReserve: number;
  uploadIds: string[];
}
