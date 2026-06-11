"use client";

import { useMemo, useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaxQuarterBanner } from "@/components/tax/tax-quarter-banner";
import { getQuickOverview } from "@/lib/tax/tax-clarity";
import { formatCurrency } from "@/lib/format";
import { TAX_COLORS } from "@/lib/tax/colors";
import { cn } from "@/lib/utils";

export function TaxHomePreviewView() {
  const overview = useMemo(() => getQuickOverview(), []);
  const [transferred, setTransferred] = useState(false);

  const vatDueLabel =
    overview.vatDaysUntilDue > 0
      ? `due in ${overview.vatDaysUntilDue} days`
      : overview.vatDaysUntilDue === 0
        ? "due today"
        : "overdue";

  const handleTransfer = () => {
    setTransferred(true);
  };

  return (
    <div>
      <TaxQuarterBanner />

      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          <span className="text-gradient">Am I safe this quarter?</span>
        </h1>
        <p className="mt-1 text-sm text-subtle">
          Preview home — when this feels right, we&apos;ll swap it in for Dashboard.
        </p>
      </div>

      {/* Top: 3 giant cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <GiantCard
          label="Personal income"
          sub="Set aside from personal-bank affiliates"
          value={formatCurrency(overview.personalSplit)}
          hint={`Reserve ~${formatCurrency(overview.personalTaxEstimate.totalTax)} tax on salary + divs`}
          color={TAX_COLORS.personal}
          borderColor={`${TAX_COLORS.personal}44`}
        />
        <GiantCard
          label="Company / Ltd income"
          sub="Avaken Ltd · Tide"
          value={formatCurrency(overview.companySplit)}
          hint="Corp tax + VAT on company turnover"
          color={TAX_COLORS.company}
          borderColor={`${TAX_COLORS.company}44`}
        />
        <GiantCard
          label={overview.covered ? "Reserves covered" : "Reserves needed"}
          sub={
            overview.covered
              ? `${Math.round(overview.coverageRatio * 100)}% funded in Tide`
              : `${formatCurrency(overview.reservesGap)} still to move`
          }
          value={formatCurrency(overview.totalToSetAside)}
          hint={`VAT ${formatCurrency(overview.vatDue)} (${vatDueLabel})`}
          color={overview.covered ? TAX_COLORS.good : TAX_COLORS.action}
          borderColor={overview.covered ? `${TAX_COLORS.good}44` : `${TAX_COLORS.action}44`}
          emoji={overview.statusEmoji}
        />
      </div>

      {/* Transfer CTA */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          onClick={handleTransfer}
          disabled={transferred || overview.reservesGap <= 0}
          className={cn(
            "h-12 px-6 text-base",
            overview.reservesGap > 0 && !transferred && "shadow-[0_8px_32px_-8px_rgba(244,63,94,0.5)]",
          )}
          style={
            overview.reservesGap > 0 && !transferred
              ? { background: TAX_COLORS.action, color: "#fff" }
              : undefined
          }
        >
          <ArrowRightLeft className="size-5" />
          {transferred
            ? "Transfer queued ✓"
            : overview.reservesGap > 0
              ? `Transfer ${formatCurrency(overview.reservesGap)} to Reserves`
              : "Fully covered"}
        </Button>
        {!overview.covered && !transferred && (
          <p className="text-sm text-muted-foreground">
            Move from Tide main → VAT + Corp Tax reserve accounts.
          </p>
        )}
      </div>

      {/* Middle: affiliate table */}
      <section className="mt-10">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-[0.12em] text-subtle">
          Affiliate accounts
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-border/60">
          <table className="w-full min-w-[520px] text-left">
            <thead>
              <tr className="border-b border-border/60 bg-white/[0.02] text-xs uppercase tracking-wide text-subtle">
                <th className="px-4 py-3 font-medium">Account</th>
                <th className="px-4 py-3 font-medium text-right" style={{ color: TAX_COLORS.company }}>
                  Company £
                </th>
                <th className="px-4 py-3 font-medium text-right" style={{ color: TAX_COLORS.personal }}>
                  Personal £
                </th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {overview.perAccount.map((a) => {
                const company = a.payTo === "company" ? a.quarter : 0;
                const personal = a.payTo === "personal" ? a.quarter : 0;
                return (
                  <tr key={a.id} className="text-[15px] transition-colors hover:bg-white/[0.02]">
                    <td className="px-4 py-3.5">
                      <span className="font-medium">{a.handle}</span>
                      <span className="ml-2 text-xs text-subtle">{a.niche}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right tabular" style={{ color: company ? TAX_COLORS.company : undefined }}>
                      {company ? formatCurrency(company) : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular" style={{ color: personal ? TAX_COLORS.personal : undefined }}>
                      {personal ? formatCurrency(personal) : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular font-medium">{formatCurrency(a.quarter)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border/60 bg-white/[0.02] font-semibold">
                <td className="px-4 py-3.5">Total</td>
                <td className="px-4 py-3.5 text-right tabular" style={{ color: TAX_COLORS.company }}>
                  {formatCurrency(overview.companySplit)}
                </td>
                <td className="px-4 py-3.5 text-right tabular" style={{ color: TAX_COLORS.personal }}>
                  {formatCurrency(overview.personalSplit)}
                </td>
                <td className="px-4 py-3.5 text-right tabular">{formatCurrency(overview.totalRevenue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Bottom: Tide reserve progress */}
      <section className="mt-10">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-[0.12em] text-subtle">
          Tide reserve balances
        </h2>
        <div className="space-y-4">
          {overview.reserveLines.map((line) => {
            const pct = Math.min(line.coverage, 1);
            const ok = pct >= 0.95;
            const barColor = ok ? TAX_COLORS.good : pct >= 0.5 ? TAX_COLORS.personal : TAX_COLORS.action;
            return (
              <div key={line.id} className="rounded-2xl border border-border/60 bg-card/40 p-5">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{line.label}</p>
                    {line.accountName && (
                      <p className="text-xs text-subtle">{line.accountName}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[48px] font-semibold leading-none tabular tracking-tight" style={{ color: barColor }}>
                      {formatCurrency(line.reserved)}
                    </p>
                    <p className="mt-1 text-xs text-subtle">
                      of {formatCurrency(line.amount)} needed
                    </p>
                  </div>
                </div>
                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct * 100}%`, background: barColor }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-subtle">{line.basis}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function GiantCard({
  label,
  sub,
  value,
  hint,
  color,
  borderColor,
  emoji,
}: {
  label: string;
  sub: string;
  value: string;
  hint: string;
  color: string;
  borderColor: string;
  emoji?: string;
}) {
  return (
    <div
      className="rounded-2xl border bg-card/40 p-6"
      style={{ borderColor }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium uppercase tracking-wide" style={{ color }}>
          {label}
        </p>
        {emoji && <span className="text-xl">{emoji}</span>}
      </div>
      <p className="mt-4 text-[48px] font-semibold leading-none tabular tracking-tight sm:text-[52px]" style={{ color }}>
        {value}
      </p>
      <p className="mt-3 text-sm text-muted-foreground">{sub}</p>
      <p className="mt-1 text-xs text-subtle">{hint}</p>
    </div>
  );
}
