/**
 * Formatting helpers for finance figures (GBP-first, UK locale).
 *
 * NOTE: Compact notation is hand-rolled rather than relying on
 * `Intl.NumberFormat`'s `notation: "compact"` because Node and Chromium
 * disagree on the compact suffix casing for `en-GB` (Node returns "184.2k",
 * Chromium "184.2K"), which causes React hydration mismatches.
 */

function compactString(value: number, decimals = 1): string {
  const abs = Math.abs(value);
  let n = value;
  let suffix = "";
  if (abs >= 1e12) {
    n = value / 1e12;
    suffix = "T";
  } else if (abs >= 1e9) {
    n = value / 1e9;
    suffix = "B";
  } else if (abs >= 1e6) {
    n = value / 1e6;
    suffix = "M";
  } else if (abs >= 1e3) {
    n = value / 1e3;
    suffix = "K";
  } else {
    return Math.round(value).toString();
  }
  const fixed = n.toFixed(decimals);
  // strip trailing .0
  const trimmed = fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed;
  return `${trimmed}${suffix}`;
}

export function formatCurrency(
  value: number,
  opts: { compact?: boolean; decimals?: number; signed?: boolean } = {},
): string {
  const { compact = false, decimals = 0, signed = false } = opts;
  let formatted: string;
  if (compact) {
    formatted = `£${compactString(Math.abs(value), 1)}`;
  } else {
    formatted = new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(Math.abs(value));
  }
  if (value < 0) return `-${formatted}`;
  if (signed && value > 0) return `+${formatted}`;
  return formatted;
}

export function formatNumber(value: number, opts: { compact?: boolean; decimals?: number } = {}): string {
  const { compact = false, decimals = 0 } = opts;
  if (compact) return compactString(value, 1);
  return new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number, opts: { decimals?: number; signed?: boolean } = {}): string {
  const { decimals = 1, signed = true } = opts;
  const sign = signed && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatDate(date: Date | string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", opts).format(d);
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
