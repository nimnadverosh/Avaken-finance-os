/**
 * Period helpers — MTD / QTD / YTD / UK tax year (6 Apr → 5 Apr).
 * All ranges are inclusive [start, end].
 */

export type PeriodKey = "MTD" | "QTD" | "YTD" | "TAX_YEAR" | "LAST_12M";

export interface PeriodRange {
  key: PeriodKey;
  label: string;
  start: Date;
  end: Date;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3, 1);
}

function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1);
}

/** UK personal tax year starts 6 April. */
function startOfUkTaxYear(d: Date): Date {
  const year = d.getMonth() > 2 || (d.getMonth() === 3 && d.getDate() >= 6) ? d.getFullYear() : d.getFullYear() - 1;
  return new Date(year, 3, 6);
}

export function periodRange(key: PeriodKey, now = new Date()): PeriodRange {
  switch (key) {
    case "MTD":
      return { key, label: "Month to date", start: startOfMonth(now), end: now };
    case "QTD":
      return { key, label: "Quarter to date", start: startOfQuarter(now), end: now };
    case "YTD":
      return { key, label: "Calendar YTD", start: startOfYear(now), end: now };
    case "TAX_YEAR":
      return { key, label: "UK tax year", start: startOfUkTaxYear(now), end: now };
    case "LAST_12M": {
      const start = new Date(now);
      start.setFullYear(now.getFullYear() - 1);
      return { key, label: "Last 12 months", start, end: now };
    }
  }
}

export const ALL_PERIODS: PeriodKey[] = ["MTD", "QTD", "YTD", "TAX_YEAR", "LAST_12M"];
