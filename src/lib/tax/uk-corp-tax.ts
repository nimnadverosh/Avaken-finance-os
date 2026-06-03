/**
 * UK Corporation Tax (FY2026) — tiered with marginal relief.
 *
 *   profits ≤ £50,000              → 19% (Small Profits Rate)
 *   profits ≥ £250,000             → 25% (Main Rate)
 *   £50,001 – £249,999             → 25% with Marginal Relief
 *
 * Marginal Relief = (U − A) × (N / A) × MSCR
 *   U  = upper limit (£250k)
 *   A  = taxable profits
 *   N  = taxable profits (no associated companies adj.)
 *   MSCR = 3/200 standard fraction
 *
 * Thresholds are pro-rated if the accounting period is < 12 months and
 * divided by 1 + number of associated companies (we assume 0 for Avaken).
 */

export const SMALL_PROFITS_RATE = 0.19;
export const MAIN_RATE = 0.25;
export const LOWER_LIMIT = 50_000;
export const UPPER_LIMIT = 250_000;
export const MARGINAL_RELIEF_FRACTION = 3 / 200;

export interface CorpTaxBreakdown {
  profits: number;
  rate: number; // effective rate
  taxBeforeRelief: number;
  marginalRelief: number;
  tax: number;
  band: "small" | "marginal" | "main";
}

export function corpTax(profits: number): CorpTaxBreakdown {
  if (profits <= 0) {
    return { profits, rate: 0, taxBeforeRelief: 0, marginalRelief: 0, tax: 0, band: "small" };
  }
  if (profits <= LOWER_LIMIT) {
    const tax = profits * SMALL_PROFITS_RATE;
    return { profits, rate: SMALL_PROFITS_RATE, taxBeforeRelief: tax, marginalRelief: 0, tax, band: "small" };
  }
  if (profits >= UPPER_LIMIT) {
    const tax = profits * MAIN_RATE;
    return { profits, rate: MAIN_RATE, taxBeforeRelief: tax, marginalRelief: 0, tax, band: "main" };
  }
  const taxBeforeRelief = profits * MAIN_RATE;
  const marginalRelief = (UPPER_LIMIT - profits) * MARGINAL_RELIEF_FRACTION;
  const tax = taxBeforeRelief - marginalRelief;
  return {
    profits,
    rate: tax / profits,
    taxBeforeRelief,
    marginalRelief,
    tax,
    band: "marginal",
  };
}
