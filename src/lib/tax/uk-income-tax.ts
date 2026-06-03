/**
 * UK Personal tax — FY 2025/26 (England, non-Scottish).
 *
 *   Income tax bands:                    Dividend tax bands (post allowance):
 *     £0      – £12,570    0% (PA)         £500          0% (Allowance)
 *     £12,571 – £50,270    20% Basic       Basic         8.75%
 *     £50,271 – £125,140   40% Higher      Higher        33.75%
 *     £125,141 +           45% Additional  Additional    39.35%
 *
 *   Class 1 employee NIC:
 *     £0      – £12,570    0%
 *     £12,571 – £50,270    8%
 *     £50,271 +            2%
 *
 *   Personal Allowance is tapered: £1 reduction per £2 of income above £100k
 *   (fully eliminated by £125,140).
 */

export const PERSONAL_ALLOWANCE = 12_570;
export const BASIC_BAND_TOP = 50_270;
export const HIGHER_BAND_TOP = 125_140;
export const PA_TAPER_THRESHOLD = 100_000;

export const DIVIDEND_ALLOWANCE = 500;

export interface TaxBreakdown {
  salary: number;
  dividends: number;
  total: number;
  personalAllowance: number;
  incomeTax: number;
  dividendTax: number;
  nic: number;
  totalTax: number;
  takeHome: number;
  effectiveRate: number;
}

function taperPA(income: number): number {
  if (income <= PA_TAPER_THRESHOLD) return PERSONAL_ALLOWANCE;
  const taper = (income - PA_TAPER_THRESHOLD) / 2;
  return Math.max(0, PERSONAL_ALLOWANCE - taper);
}

function bandTax(amount: number, ceiling: number, rate: number, taxableConsumed: number) {
  const cap = Math.max(0, ceiling - taxableConsumed);
  const taxed = Math.min(amount, cap);
  return { tax: taxed * rate, consumed: taxed };
}

export function ukPersonalTax(salary: number, dividends: number): TaxBreakdown {
  const total = salary + dividends;
  const pa = taperPA(total);

  // Salary income tax: allocate PA to salary first.
  const salaryAfterPa = Math.max(0, salary - pa);
  let consumed = 0;
  const basic = bandTax(salaryAfterPa, BASIC_BAND_TOP - pa, 0.2, consumed);
  consumed += basic.consumed;
  const higher = bandTax(salaryAfterPa - consumed, HIGHER_BAND_TOP - pa, 0.4, consumed);
  consumed += higher.consumed;
  const additional = Math.max(0, salaryAfterPa - consumed) * 0.45;
  const incomeTax = basic.tax + higher.tax + additional;

  // NIC on salary (Class 1 employee)
  const nicBasic = Math.max(0, Math.min(salary, BASIC_BAND_TOP) - PERSONAL_ALLOWANCE) * 0.08;
  const nicAbove = Math.max(0, salary - BASIC_BAND_TOP) * 0.02;
  const nic = nicBasic + nicAbove;

  // Dividend tax: stacks on top of salary, uses any leftover PA + dividend allowance.
  const paLeftForDivs = Math.max(0, pa - salary);
  const divAfterAllowances = Math.max(0, dividends - paLeftForDivs - DIVIDEND_ALLOWANCE);

  // Position in bands measured from total taxable income at top of salary.
  const taxableSalary = Math.max(0, salary - pa);
  let divConsumed = 0;
  const divBasicCap = Math.max(0, BASIC_BAND_TOP - pa - taxableSalary);
  const divBasic = Math.min(divAfterAllowances, divBasicCap) * 0.0875;
  divConsumed += Math.min(divAfterAllowances, divBasicCap);
  const divHigherCap = Math.max(0, HIGHER_BAND_TOP - pa - taxableSalary - divConsumed);
  const divHigher = Math.min(Math.max(0, divAfterAllowances - divConsumed), divHigherCap) * 0.3375;
  divConsumed += Math.min(Math.max(0, divAfterAllowances - divConsumed), divHigherCap);
  const divAdd = Math.max(0, divAfterAllowances - divConsumed) * 0.3935;
  const dividendTax = divBasic + divHigher + divAdd;

  const totalTax = incomeTax + dividendTax + nic;
  return {
    salary,
    dividends,
    total,
    personalAllowance: pa,
    incomeTax,
    dividendTax,
    nic,
    totalTax,
    takeHome: total - totalTax,
    effectiveRate: total === 0 ? 0 : totalTax / total,
  };
}
