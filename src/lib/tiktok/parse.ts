/**
 * Parser for the monthly TikTok Shop / Affiliate "earnings detail" export.
 *
 * Real-world structure of these files (verified against Oct & Nov 2025 exports):
 *
 *   Workbook
 *   ├─ "Sheet1"              ← the data
 *   │   row 1   A: VAT disclaimer paragraph
 *   │   row 2   A:"Date period （UTC+0)"      B:"2025 Nov."   ← period label
 *   │   row 3   A:"Creator name"              B:"<name>"
 *   │   row 4   A:"Creator VAT number..."     B:"<vat?>"
 *   │   row 5   (blank)
 *   │   row 6   header row: Date (UTC+0) | Transaction ID | Type of earnings |
 *   │           Currency | Income | Expense | Payer | Payer country | …
 *   │   row 7+  data rows
 *   └─ "Fields explantion"  ← a static legend we ignore
 *
 * Two quirks make naive parsing fail, both handled below:
 *   1. STALE DIMENSION: TikTok writes `<dimension ref="A1:Z6">` even when there
 *      are 1,000+ data rows. SheetJS honours `!ref`, so we recompute the true
 *      range from the populated cells before reading.
 *   2. SKIP ROWS: the header is on row 6, not row 1, and its position can drift,
 *      so we detect it by content rather than assuming a fixed offset.
 */

import * as XLSX from "xlsx";
import type {
  ParsedTikTokReport,
  TikTokDailyPoint,
  TikTokGroupTotal,
  TikTokLineItem,
} from "./types";

/** FX rates used to normalise non-GBP rows into GBP (GBP-first dashboard). */
const FX_RATES: Record<string, number> = {
  GBP: 1,
  EUR: 0.86,
  USD: 0.79,
};

/** Earning types that represent a sale/order (everything except platform rewards). */
const NON_ORDER_TYPES = new Set(["Cash reward from platform"]);

/** Canonical header labels we look for, lower-cased for fuzzy matching. */
const COLUMN_ALIASES: Record<string, string[]> = {
  date: ["date (utc+0)", "date"],
  transactionId: ["transaction id"],
  type: ["type of earnings"],
  currency: ["currency"],
  income: ["income"],
  expense: ["expense"],
  payer: ["payer"],
  payerCountry: ["payer country"],
};

type ColumnIndex = Partial<Record<keyof typeof COLUMN_ALIASES, number>>;

/** Coerce a sheet into a dense array-of-arrays, repairing the stale `!ref`. */
function readRows(ws: XLSX.WorkSheet): unknown[][] {
  const addresses = Object.keys(ws).filter((k) => !k.startsWith("!"));
  let maxRow = 0;
  let maxCol = 0;
  for (const addr of addresses) {
    const { r, c } = XLSX.utils.decode_cell(addr);
    if (r > maxRow) maxRow = r;
    if (c > maxCol) maxCol = c;
  }
  // Override the (often wrong) declared range with the real one.
  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxRow, c: maxCol } });
  return XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, defval: null });
}

/** Locate the header row + column positions by matching known labels. */
function findColumns(rows: unknown[][]): { headerRow: number; columns: ColumnIndex } {
  for (let r = 0; r < Math.min(rows.length, 25); r++) {
    const cells = rows[r].map((c) => String(c ?? "").trim().toLowerCase());
    const columns: ColumnIndex = {};
    for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
      const idx = cells.findIndex((cell) => aliases.includes(cell));
      if (idx !== -1) columns[key as keyof ColumnIndex] = idx;
    }
    // A valid header row must expose the figures we actually aggregate.
    if (columns.income !== undefined && columns.type !== undefined && columns.date !== undefined) {
      return { headerRow: r, columns };
    }
  }
  throw new Error(
    "Could not find the earnings table header. Is this a TikTok Shop earnings detail export?",
  );
}

/** Read the "Date period （UTC+0)" metadata cell, tolerant of full-width brackets. */
function findPeriodLabel(rows: unknown[][], headerRow: number): string {
  for (let r = 0; r < headerRow; r++) {
    const label = String(rows[r]?.[0] ?? "").toLowerCase();
    if (label.includes("date period")) {
      const value = String(rows[r]?.[1] ?? "").trim();
      if (value) return value;
    }
  }
  return "";
}

function findMetaValue(rows: unknown[][], headerRow: number, needle: string): string {
  for (let r = 0; r < headerRow; r++) {
    const label = String(rows[r]?.[0] ?? "").toLowerCase();
    if (label.includes(needle)) return String(rows[r]?.[1] ?? "").trim();
  }
  return "";
}

const MONTHS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

/** Turn "2025 Nov." (or "Nov 2025", ISO dates, …) into a normalised month key. */
function normaliseMonth(
  periodLabel: string,
  fallbackDate: string,
): { monthKey: string; year: number; month: number; shortMonth: string } {
  const text = periodLabel.toLowerCase();
  const yearMatch = text.match(/(20\d{2})/);
  const monthIdx = MONTHS.findIndex((m) => text.includes(m));

  let year = yearMatch ? Number(yearMatch[1]) : NaN;
  let month = monthIdx >= 0 ? monthIdx + 1 : NaN;

  // Fall back to the first data row's date if the label was unparseable.
  if ((Number.isNaN(year) || Number.isNaN(month)) && fallbackDate) {
    const d = new Date(fallbackDate);
    if (!Number.isNaN(d.getTime())) {
      year = d.getUTCFullYear();
      month = d.getUTCMonth() + 1;
    }
  }

  if (Number.isNaN(year)) year = new Date().getFullYear();
  if (Number.isNaN(month)) month = new Date().getMonth() + 1;

  const shortMonth = MONTHS[month - 1].replace(/^\w/, (c) => c.toUpperCase());
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  return { monthKey, year, month, shortMonth };
}

/** Parse a possibly-string numeric cell (handles "", "1,234.5", "£2.40"). */
function num(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value == null) return 0;
  const cleaned = String(value).replace(/[£$€,\s]/g, "");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** Normalise a date cell to an ISO YYYY-MM-DD string. */
function isoDate(value: unknown): string {
  if (value == null) return "";
  const raw = String(value).trim();
  // Already ISO-ish.
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toISOString().slice(0, 10);
}

function topN(map: Map<string, TikTokGroupTotal>, n?: number): TikTokGroupTotal[] {
  const sorted = [...map.values()].sort((a, b) => b.revenue - a.revenue);
  return n ? sorted.slice(0, n) : sorted;
}

/**
 * Parse a TikTok earnings workbook (already loaded as bytes) into a faithful,
 * GBP-normalised report. Pure & side-effect free — safe to run in the browser.
 */
export function parseTikTokWorkbook(data: ArrayBuffer | Uint8Array): ParsedTikTokReport {
  const wb = XLSX.read(data, { type: "array" });
  // The earnings grid is the first sheet; "Fields explantion" is just a legend.
  const dataSheetName =
    wb.SheetNames.find((n) => n.toLowerCase() !== "fields explantion") ?? wb.SheetNames[0];
  const ws = wb.Sheets[dataSheetName];
  if (!ws) throw new Error("The workbook has no readable sheet.");

  const rows = readRows(ws);
  const { headerRow, columns } = findColumns(rows);
  const warnings: string[] = [];

  const lineItems: TikTokLineItem[] = [];
  const byType = new Map<string, TikTokGroupTotal>();
  const byBrand = new Map<string, TikTokGroupTotal>();
  const byDay = new Map<string, TikTokDailyPoint>();
  const currencies = new Set<string>();

  let grossRevenue = 0;
  let totalExpense = 0;
  let orderCount = 0;
  let nonGbpRows = 0;

  for (let r = headerRow + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;

    const transactionId = String(row[columns.transactionId ?? 1] ?? "").trim();
    const rawIncome = row[columns.income ?? 4];
    // Skip empty / structurally blank rows (no id and no income).
    if (!transactionId && (rawIncome == null || rawIncome === "")) continue;

    const currency = String(row[columns.currency ?? 3] ?? "GBP").trim().toUpperCase() || "GBP";
    const fx = FX_RATES[currency];
    if (fx === undefined) {
      warnings.push(`Unknown currency "${currency}" — treated 1:1 with GBP.`);
    }
    if (currency !== "GBP") nonGbpRows++;

    const income = num(rawIncome);
    const expense = num(row[columns.expense ?? 5]);
    const incomeGbp = income * (fx ?? 1);
    const type = String(row[columns.type ?? 2] ?? "Other").trim() || "Other";
    const payer = String(row[columns.payer ?? 6] ?? "Unknown brand").trim() || "Unknown brand";
    const payerCountry = String(row[columns.payerCountry ?? 7] ?? "").trim();
    const date = isoDate(row[columns.date ?? 0]);

    currencies.add(currency);
    grossRevenue += incomeGbp;
    totalExpense += expense * (fx ?? 1);
    if (!NON_ORDER_TYPES.has(type)) orderCount++;

    const typeBucket = byType.get(type) ?? { name: type, revenue: 0, orders: 0 };
    typeBucket.revenue += incomeGbp;
    typeBucket.orders += 1;
    byType.set(type, typeBucket);

    const brandBucket = byBrand.get(payer) ?? { name: payer, revenue: 0, orders: 0 };
    brandBucket.revenue += incomeGbp;
    brandBucket.orders += 1;
    byBrand.set(payer, brandBucket);

    if (date) {
      const day = byDay.get(date) ?? { date, label: String(Number(date.slice(8, 10))), revenue: 0 };
      day.revenue += incomeGbp;
      byDay.set(date, day);
    }

    if (lineItems.length < 600) {
      lineItems.push({
        date,
        transactionId,
        type,
        currency,
        income,
        expense,
        incomeGbp,
        payer,
        payerCountry,
      });
    }
  }

  if (lineItems.length === 0) {
    throw new Error("No earnings rows were found in this report.");
  }
  if (nonGbpRows > 0) {
    warnings.push(`${nonGbpRows} non-GBP row(s) converted to GBP for the dashboard.`);
  }

  const periodLabel = findPeriodLabel(rows, headerRow);
  const firstDate = lineItems[0]?.date ?? "";
  const { monthKey, year, month, shortMonth } = normaliseMonth(periodLabel, firstDate);

  const round2 = (n: number) => Math.round(n * 100) / 100;
  const daily = [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));

  return {
    periodLabel: periodLabel || `${shortMonth} ${year}`,
    monthKey,
    year,
    month,
    shortMonth,
    creatorName: findMetaValue(rows, headerRow, "creator name"),
    creatorVatNumber: findMetaValue(rows, headerRow, "creator vat"),

    grossRevenue: round2(grossRevenue),
    totalExpense: round2(totalExpense),
    netRevenue: round2(grossRevenue - totalExpense),
    orderCount,
    lineCount: lineItems.length,

    currencies: [...currencies],
    byType: topN(byType).map((g) => ({ ...g, revenue: round2(g.revenue) })),
    topBrands: topN(byBrand, 8).map((g) => ({ ...g, revenue: round2(g.revenue) })),
    daily: daily.map((d) => ({ ...d, revenue: round2(d.revenue) })),

    sampleLineItems: lineItems.slice(0, 12),
    warnings,
  };
}

/** Convenience wrapper that reads a browser File via its ArrayBuffer. */
export async function parseTikTokFile(file: File): Promise<ParsedTikTokReport> {
  const buffer = await file.arrayBuffer();
  return parseTikTokWorkbook(buffer);
}
