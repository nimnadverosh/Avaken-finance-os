"use client";

import { useMemo } from "react";
import { getQuickOverview } from "@/lib/tax/tax-clarity";
import { formatCurrency } from "@/lib/format";
import { TAX_COLORS } from "@/lib/tax/colors";

/** Sticky quarter strip — answers "where am I?" in one line. */
export function TaxQuarterBanner() {
  const o = useMemo(() => getQuickOverview(), []);

  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border/60 bg-card/50 px-4 py-3 text-sm">
      <span className="text-base" aria-hidden>
        {o.statusEmoji}
      </span>
      <span className="font-semibold tracking-tight">{o.quarterLabel}</span>
      <span className="text-subtle">•</span>
      <span className="tabular font-medium">{formatCurrency(o.totalRevenue)} total</span>
      <span className="text-subtle">•</span>
      <span className="tabular font-medium" style={{ color: TAX_COLORS.company }}>
        {formatCurrency(o.companySplit)} company
      </span>
      <span className="text-subtle">•</span>
      <span className="tabular font-medium" style={{ color: TAX_COLORS.personal }}>
        {formatCurrency(o.personalSplit)} personal
      </span>
    </div>
  );
}
