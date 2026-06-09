"use client";

import { Card } from "@/components/ui/card";
import {
  getConsolidatedFinancialSummary,
  getPersonalFinancialSummary,
} from "@/lib/data/personal-summary";
import { getLatestDailyUpdate } from "@/lib/data/daily-updates";
import type { Entity } from "@/lib/data/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { useMockDataVersion } from "@/hooks/use-mock-data-version";
import { cn } from "@/lib/utils";

/** Balance summary driven by the daily morning update. */
export function PersonalSummaryCards({ entity }: { entity: Entity }) {
  useMockDataVersion();
  const latest = getLatestDailyUpdate();
  const isConsolidated = entity === "consolidated";

  if (isConsolidated) {
    const { bankBalances, creditCardDebt, avakenTideBalance, totalNetPosition } =
      getConsolidatedFinancialSummary();
    const netPositive = totalNetPosition >= 0;

    return (
      <div className="space-y-3">
        {latest && <LastSavedLine updatedAt={latest.updatedAt} />}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <BalanceKpi
            index={0}
            label="Personal banks"
            sub="Starling · RBS · Barclays"
            value={bankBalances}
            accent="#38bdf8"
            valueClassName="text-info"
          />
          <BalanceKpi
            index={1}
            label="Avaken / Tide"
            sub="Business operating account"
            value={avakenTideBalance}
            accent="#10b981"
            valueClassName="text-positive"
          />
          <BalanceKpi
            index={2}
            label="Credit card debt"
            sub="All personal cards"
            value={creditCardDebt}
            accent="#f43f5e"
            valueClassName="text-negative"
          />
          <BalanceKpi
            index={3}
            label="Combined net"
            sub="Personal net + Tide balance"
            value={totalNetPosition}
            accent={netPositive ? "#10b981" : "#f43f5e"}
            valueClassName={netPositive ? "text-positive" : "text-negative"}
          />
        </div>
      </div>
    );
  }

  const { bankBalances, creditCardDebt, netPosition } = getPersonalFinancialSummary();
  const netPositive = netPosition >= 0;

  return (
    <div className="space-y-3">
      {latest && <LastSavedLine updatedAt={latest.updatedAt} />}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <BalanceKpi
          index={0}
          label="Bank balances"
          sub="Total available · current & savings"
          value={bankBalances}
          accent="#10b981"
          valueClassName="text-positive"
        />
        <BalanceKpi
          index={1}
          label="Credit card debt"
          sub="Amex · RBS · Barclays cards"
          value={creditCardDebt}
          accent="#f43f5e"
          valueClassName="text-negative"
        />
        <BalanceKpi
          index={2}
          label="Net position"
          sub="Bank balances minus card debt"
          value={netPosition}
          accent={netPositive ? "#10b981" : "#f43f5e"}
          valueClassName={netPositive ? "text-positive" : "text-negative"}
        />
      </div>
    </div>
  );
}

function LastSavedLine({ updatedAt }: { updatedAt: string }) {
  return (
    <p className="text-[11px] text-subtle">
      Last morning update{" "}
      <span className="text-muted-foreground">
        {formatDate(updatedAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
      </span>
    </p>
  );
}

function BalanceKpi({
  label,
  sub,
  value,
  accent,
  valueClassName,
  index,
}: {
  label: string;
  sub: string;
  value: number;
  accent: string;
  valueClassName: string;
  index: number;
}) {
  return (
    <Card
      className="animate-fade-up relative overflow-hidden p-5"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full opacity-25 blur-2xl"
        style={{ background: accent }}
      />
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className={cn("tabular text-2xl font-semibold tracking-tight", valueClassName)}>
            {formatCurrency(value)}
          </p>
        </div>
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ background: accent, boxShadow: `0 0 12px ${accent}` }}
        />
      </div>
      <p className="mt-3 text-[11px] text-subtle">{sub}</p>
    </Card>
  );
}
