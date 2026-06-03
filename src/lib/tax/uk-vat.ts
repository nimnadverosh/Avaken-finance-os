/**
 * UK VAT — Making Tax Digital (MTD) 9-box return.
 *
 *   Box 1  VAT due on sales and other outputs
 *   Box 2  VAT due on acquisitions from EU member states (NI only, usually 0)
 *   Box 3  Total VAT due (Box 1 + Box 2)
 *   Box 4  VAT reclaimed on purchases and other inputs
 *   Box 5  Net VAT to pay HMRC (Box 3 − Box 4) [or reclaim if negative]
 *   Box 6  Total sales (ex VAT)
 *   Box 7  Total purchases (ex VAT)
 *   Box 8  Total EU supplies of goods (NI only)
 *   Box 9  Total EU acquisitions of goods (NI only)
 */

import type { VatPeriod } from "@/lib/data/types";

export const VAT_STANDARD_RATE = 0.2;
export const VAT_REDUCED_RATE = 0.05;
export const VAT_ZERO_RATE = 0;

export interface VatReturn {
  box1: number;
  box2: number;
  box3: number;
  box4: number;
  box5: number;
  box6: number;
  box7: number;
  box8: number;
  box9: number;
}

export function buildVatReturn(period: VatPeriod): VatReturn {
  const box1 = period.vatOnSales;
  const box2 = 0;
  const box3 = box1 + box2;
  const box4 = period.vatOnPurchases;
  const box5 = box3 - box4;
  const box6 = period.salesExVat;
  const box7 = period.purchasesExVat;
  return { box1, box2, box3, box4, box5, box6, box7, box8: 0, box9: 0 };
}
