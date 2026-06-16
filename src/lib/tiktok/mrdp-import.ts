/**
 * Converts a parsed MRDP annual report into monthly TikTok upload records
 * and persists them with user-chosen entity assignments.
 */

import { corpTax } from "@/lib/tax/uk-corp-tax";
import {
  COMPANY_PROFIT_MARGIN,
  PERSONAL_RESERVE_RATE,
  VAT_RATE,
} from "@/lib/tax/tax-clarity";
import type { ParsedTikTokReport, SplitConfig } from "./types";
import type {
  MrdpEntityAssignment,
  MrdpImportResult,
  MrdpQuarterSummary,
  ParsedMrdpReport,
} from "./mrdp-types";
import {
  entityToSplit,
  monthLabel,
  quarterMonths,
  resolveQuarterEntity,
} from "./parse-mrdp";
import { saveTikTokUpload } from "./store";

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const INPUT_VAT_RATIO = 0.18;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Split a quarterly total evenly across 3 months, fixing rounding on the last month. */
function splitAcrossMonths(total: number, count: number): [number, number, number] {
  if (count === 0) return [0, 0, 0];
  const perMonth = round2(total / 3);
  const first = perMonth;
  const second = perMonth;
  const third = round2(total - first - second);
  return [first, second, third];
}

/** Split transaction count across 3 months (integer, remainder to last month). */
function splitCountAcrossMonths(total: number): [number, number, number] {
  if (total === 0) return [0, 0, 0];
  const base = Math.floor(total / 3);
  const remainder = total - base * 3;
  return [base, base, base + remainder];
}

/** Build a ParsedTikTokReport for one calendar month from a quarter's data. */
function buildMonthlyReport(
  year: number,
  month: number,
  revenue: number,
  orderCount: number,
  creatorName: string,
  creatorVatNumber: string,
  sampleTransactions: MrdpQuarterSummary["transactions"],
): ParsedTikTokReport {
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  const shortMonth = MONTH_SHORT[month - 1]!;
  const periodLabel = monthLabel(year, month);

  const byType = revenue > 0
    ? [{ name: "Affiliate commission", revenue, orders: orderCount }]
    : [];

  const sampleLineItems = sampleTransactions.slice(0, 12).map((t) => ({
    date: `${monthKey}-15`,
    transactionId: t.orderId,
    type: "Affiliate commission" as const,
    currency: "GBP",
    income: t.amount,
    expense: 0,
    incomeGbp: t.amount,
    payer: "TikTok Shop",
    payerCountry: "GB",
  }));

  return {
    periodLabel,
    monthKey,
    year,
    month,
    shortMonth,
    creatorName,
    creatorVatNumber,
    grossRevenue: revenue,
    totalExpense: 0,
    netRevenue: revenue,
    orderCount,
    lineCount: orderCount,
    currencies: ["GBP"],
    byType,
    topBrands: revenue > 0 ? [{ name: "TikTok Shop", revenue, orders: orderCount }] : [],
    daily: revenue > 0
      ? [{ date: `${monthKey}-15`, label: "15", revenue }]
      : [],
    sampleLineItems,
    warnings: [],
  };
}

/**
 * Import an MRDP report into the Finance OS ledger.
 * Creates one monthly upload per active month, with entity split per user choice.
 */
export async function importMrdpReport(
  report: ParsedMrdpReport,
  assignment: MrdpEntityAssignment,
  accountId: string,
): Promise<MrdpImportResult> {
  const uploadIds: string[] = [];
  let companyRevenue = 0;
  let personalRevenue = 0;
  let monthsImported = 0;

  for (const quarter of report.quarters) {
    if (quarter.revenue <= 0 && quarter.transactionCount <= 0) continue;

    const entity = resolveQuarterEntity(quarter.quarter, assignment);
    const split: SplitConfig = entityToSplit(entity);
    const months = quarterMonths(quarter.quarterIndex);
    const [rev1, rev2, rev3] = splitAcrossMonths(quarter.revenue, quarter.transactionCount);
    const [cnt1, cnt2, cnt3] = splitCountAcrossMonths(quarter.transactionCount);

    const revenues = [rev1, rev2, rev3];
    const counts = [cnt1, cnt2, cnt3];

    // Distribute sample transactions across months for preview data
    const txPerMonth = Math.ceil(quarter.transactions.length / 3);

    for (let i = 0; i < months.length; i++) {
      const month = months[i]!;
      const revenue = revenues[i]!;
      const orderCount = counts[i]!;
      if (revenue <= 0 && orderCount <= 0) continue;

      const txSlice = quarter.transactions.slice(i * txPerMonth, (i + 1) * txPerMonth);
      const monthlyReport = buildMonthlyReport(
        report.year,
        month,
        revenue,
        orderCount,
        report.creatorName,
        report.vatNumber,
        txSlice,
      );

      const fileName = `MRDP ${report.year} ${quarter.quarter} → ${monthlyReport.periodLabel}`;
      const record = await saveTikTokUpload(monthlyReport, fileName, accountId, split);
      uploadIds.push(record.id);
      monthsImported++;

      if (entity === "avaken") companyRevenue += revenue;
      else personalRevenue += revenue;
    }
  }

  companyRevenue = round2(companyRevenue);
  personalRevenue = round2(personalRevenue);
  const totalRevenue = round2(companyRevenue + personalRevenue);

  const companyProfit = companyRevenue * COMPANY_PROFIT_MARGIN;
  const corpRate = corpTax(companyProfit * 4).rate;
  const corpTaxReserve = round2(companyProfit * corpRate);
  const outputVat = companyRevenue * VAT_RATE;
  const vatReserve = round2(outputVat * (1 - INPUT_VAT_RATIO));
  const personalTaxReserve = round2(personalRevenue * PERSONAL_RESERVE_RATE);
  const totalReserve = round2(corpTaxReserve + vatReserve + personalTaxReserve);

  return {
    year: report.year,
    monthsImported,
    totalRevenue,
    totalTransactions: report.totalTransactions,
    companyRevenue,
    personalRevenue,
    corpTaxReserve,
    vatReserve,
    personalTaxReserve,
    totalReserve,
    uploadIds,
  };
}

/** Preview entity split totals before committing import. */
export function previewMrdpAssignment(
  report: ParsedMrdpReport,
  assignment: MrdpEntityAssignment,
): { companyRevenue: number; personalRevenue: number } {
  let companyRevenue = 0;
  let personalRevenue = 0;

  for (const quarter of report.quarters) {
    if (quarter.revenue <= 0) continue;
    const entity = resolveQuarterEntity(quarter.quarter, assignment);
    if (entity === "avaken") companyRevenue += quarter.revenue;
    else personalRevenue += quarter.revenue;
  }

  return {
    companyRevenue: round2(companyRevenue),
    personalRevenue: round2(personalRevenue),
  };
}
