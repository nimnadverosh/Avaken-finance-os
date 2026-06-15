/**
 * Parser for TikTok Shop MRDP (Marketplace Reporting for DAC7) annual Excel reports.
 *
 * Workbook structure (verified against 2025 export):
 *   ├─ "MRDP report"                    ← summary with quarterly totals
 *   ├─ "Consideration detail for Q1–Q4" ← order-level line items per quarter
 *   ├─ "Number Of Activities for Q1–Q4" ← activity counts (we use detail sheets)
 *   └─ "Explanation"                    ← field legend (ignored)
 */

import * as XLSX from "xlsx";
import type {
  MrdpQuarter,
  MrdpQuarterSummary,
  MrdpTransaction,
  ParsedMrdpReport,
} from "./mrdp-types";

const QUARTERS: MrdpQuarter[] = ["Q1", "Q2", "Q3", "Q4"];

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Coerce a sheet into a dense array-of-arrays, repairing stale `!ref`. */
function readRows(ws: XLSX.WorkSheet): unknown[][] {
  const addresses = Object.keys(ws).filter((k) => !k.startsWith("!"));
  let maxRow = 0;
  let maxCol = 0;
  for (const addr of addresses) {
    const { r, c } = XLSX.utils.decode_cell(addr);
    if (r > maxRow) maxRow = r;
    if (c > maxCol) maxCol = c;
  }
  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxRow, c: maxCol } });
  return XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, defval: null });
}

function num(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value == null) return 0;
  const cleaned = String(value).replace(/[£$€,\s]/g, "");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Build a header label → column index map from the first row. */
function headerMap(row: unknown[]): Map<string, number> {
  const map = new Map<string, number>();
  row.forEach((cell, i) => {
    const label = String(cell ?? "").trim().toLowerCase();
    if (label) map.set(label, i);
  });
  return map;
}

function col(map: Map<string, number>, ...aliases: string[]): number | undefined {
  for (const alias of aliases) {
    const idx = map.get(alias.toLowerCase());
    if (idx !== undefined) return idx;
  }
  return undefined;
}

/** Detect whether a workbook is an MRDP report (vs monthly earnings detail). */
export function isMrdpWorkbook(data: ArrayBuffer | Uint8Array): boolean {
  const wb = XLSX.read(data, { type: "array", bookSheets: true });
  return wb.SheetNames.some((n) => n.toLowerCase().includes("mrdp report"));
}

/** Extract tax year from filename patterns like "report -2025" or "MRDP_2025". */
export function inferYearFromFileName(fileName: string): number | null {
  const match = fileName.match(/(?:^|[^0-9])(20\d{2})(?:[^0-9]|$)/);
  return match ? Number(match[1]) : null;
}

function parseQuarterDetail(
  wb: XLSX.WorkBook,
  quarter: MrdpQuarter,
): MrdpTransaction[] {
  const sheetName = wb.SheetNames.find(
    (n) => n.toLowerCase() === `consideration detail for ${quarter.toLowerCase()}`,
  );
  if (!sheetName) return [];

  const ws = wb.Sheets[sheetName];
  if (!ws) return [];

  const rows = readRows(ws);
  if (rows.length < 2) return [];

  const headers = headerMap(rows[0]!);
  const idCol = col(headers, "order id/adjustment id", "order id");
  const amountCol = col(headers, "consideration amount (in gbp)", "consideration amount");

  if (idCol === undefined || amountCol === undefined) return [];

  const transactions: MrdpTransaction[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    const orderId = String(row[idCol] ?? "").trim();
    const amount = num(row[amountCol]);
    if (!orderId && amount === 0) continue;
    transactions.push({ orderId: orderId || `row-${r}`, amount: round2(amount) });
  }
  return transactions;
}

/**
 * Parse an MRDP workbook into a structured annual report.
 * Pure & side-effect free — safe to run in the browser.
 */
export function parseMrdpWorkbook(
  data: ArrayBuffer | Uint8Array,
  fileName = "",
): ParsedMrdpReport {
  const wb = XLSX.read(data, { type: "array" });
  const warnings: string[] = [];

  const summarySheetName = wb.SheetNames.find((n) =>
    n.toLowerCase().includes("mrdp report"),
  );
  if (!summarySheetName) {
    throw new Error(
      "Could not find the MRDP report sheet. Is this a TikTok Shop MRDP tax export?",
    );
  }

  const ws = wb.Sheets[summarySheetName];
  if (!ws) throw new Error("The MRDP summary sheet is empty.");

  const rows = readRows(ws);
  if (rows.length < 2) {
    throw new Error("The MRDP summary sheet has no data rows.");
  }

  const headers = headerMap(rows[0]!);
  const dataRow = rows[1]!;

  const get = (...aliases: string[]): string => {
    const idx = col(headers, ...aliases);
    return idx !== undefined ? String(dataRow[idx] ?? "").trim() : "";
  };

  const getNum = (...aliases: string[]): number => {
    const idx = col(headers, ...aliases);
    return idx !== undefined ? num(dataRow[idx]) : 0;
  };

  const creatorId = get("id");
  const creatorType = get("individual/entity");
  const residenceCountry = get("residence country code");
  const tin = get("tin 1");
  const vatNumber = get("vat");
  const entityName = get("entity name");
  const firstName = get("individual's first name");
  const lastName = get("individual's last name");
  const creatorName = entityName || [firstName, lastName].filter(Boolean).join(" ") || "Unknown creator";
  const relevantActivities = get("relevant activities");
  const currency = get("consideration currency code") || "GBP";

  let year = inferYearFromFileName(fileName) ?? new Date().getFullYear() - 1;

  const quarters: MrdpQuarterSummary[] = QUARTERS.map((quarter, i) => {
    const qNum = i + 1;
    const summaryRevenue = getNum(`consideration (${quarter.toLowerCase()})`);
    const feesWithheld = getNum(`fees withheld (${quarter.toLowerCase()})`);
    const taxes = getNum(`taxes (${quarter.toLowerCase()})`);
    const settlementCount = Math.round(getNum(`number of settlements (${quarter.toLowerCase()})`));

    const transactions = parseQuarterDetail(wb, quarter);
    const detailRevenue = round2(transactions.reduce((s, t) => s + t.amount, 0));
    const detailCount = transactions.length;

    // Prefer detail sheet totals when available; fall back to summary row.
    let revenue = detailCount > 0 ? detailRevenue : summaryRevenue;
    let transactionCount = detailCount > 0 ? detailCount : settlementCount;

    if (detailCount > 0 && Math.abs(detailRevenue - summaryRevenue) > 0.05 && summaryRevenue > 0) {
      warnings.push(
        `${quarter}: detail sheet total (${detailRevenue.toFixed(2)}) differs from summary (${summaryRevenue.toFixed(2)}) — using detail sheet.`,
      );
      revenue = detailRevenue;
      transactionCount = detailCount;
    }

    return {
      quarter,
      quarterIndex: qNum,
      revenue: round2(revenue),
      feesWithheld: round2(feesWithheld),
      taxes: round2(taxes),
      transactionCount,
      transactions,
    };
  });

  const totalRevenue = round2(quarters.reduce((s, q) => s + q.revenue, 0));
  const totalTransactions = quarters.reduce((s, q) => s + q.transactionCount, 0);

  if (totalRevenue === 0 && totalTransactions === 0) {
    throw new Error("No revenue or transactions found in this MRDP report.");
  }

  return {
    year,
    fileName,
    creatorId,
    creatorName,
    creatorType,
    residenceCountry,
    tin,
    vatNumber,
    relevantActivities,
    currency,
    quarters,
    totalRevenue,
    totalTransactions,
    warnings,
  };
}

/** Convenience wrapper that reads a browser File via its ArrayBuffer. */
export async function parseMrdpFile(file: File): Promise<ParsedMrdpReport> {
  const buffer = await file.arrayBuffer();
  return parseMrdpWorkbook(buffer, file.name);
}

/** Default entity assignment — all personal (safe default for individuals). */
export function defaultMrdpAssignment(): import("./mrdp-types").MrdpEntityAssignment {
  return {
    mode: "all-personal",
    quarters: { Q1: "personal", Q2: "personal", Q3: "personal", Q4: "personal" },
  };
}

/** Resolve which entity a quarter should be assigned to. */
export function resolveQuarterEntity(
  quarter: MrdpQuarter,
  assignment: import("./mrdp-types").MrdpEntityAssignment,
): import("./mrdp-types").MrdpEntityChoice {
  if (assignment.mode === "all-personal") return "personal";
  if (assignment.mode === "all-avaken") return "avaken";
  return assignment.quarters[quarter];
}

/** Convert entity choice to a SplitConfig. */
export function entityToSplit(
  entity: import("./mrdp-types").MrdpEntityChoice,
): import("./types").SplitConfig {
  return entity === "avaken" ? { company: 1, personal: 0 } : { company: 0, personal: 1 };
}

/** Calendar months (1-based) covered by a quarter. */
export function quarterMonths(quarterIndex: number): number[] {
  const start = (quarterIndex - 1) * 3 + 1;
  return [start, start + 1, start + 2];
}

export function monthLabel(year: number, month: number): string {
  return `${year} ${MONTHS[month - 1]}.`;
}
