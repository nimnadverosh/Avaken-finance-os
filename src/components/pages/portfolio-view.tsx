"use client";

import { Bitcoin, Building2, LineChart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Delta } from "@/components/ui/delta";
import { PageHeader } from "./page-header";
import { AllocationDonut, type Slice } from "@/components/charts/allocation-donut";
import { getPortfolio, portfolioTotals } from "@/lib/data/queries";
import { formatCurrency, formatPercent } from "@/lib/format";

const KIND_COLOR = {
  stock: "#10b981",
  crypto: "#f59e0b",
  etf: "#38bdf8",
} as const;

const KIND_ICON = {
  stock: Building2,
  crypto: Bitcoin,
  etf: LineChart,
} as const;

const KIND_LABEL = {
  stock: "Stocks",
  crypto: "Crypto",
  etf: "ETFs",
} as const;

export function PortfolioView() {
  const positions = getPortfolio();
  const totals = portfolioTotals();

  const byKind = new Map<string, number>();
  positions.forEach((p) => byKind.set(p.kind, (byKind.get(p.kind) ?? 0) + p.value));
  const kindSlices: Slice[] = [...byKind.entries()].map(([name, value]) => ({
    name: KIND_LABEL[name as keyof typeof KIND_LABEL],
    value,
    color: KIND_COLOR[name as keyof typeof KIND_COLOR],
  }));

  return (
    <div>
      <PageHeader
        title="Portfolio"
        description={`eToro · ${positions.length} positions · ${formatCurrency(totals.value)} total`}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <BigStat label="Market value" value={formatCurrency(totals.value)} accent="#10b981" />
        <BigStat label="Cost basis" value={formatCurrency(totals.cost)} accent="#38bdf8" />
        <BigStat
          label="Unrealised P&L"
          value={formatCurrency(totals.pnl)}
          sub={formatPercent(totals.pnlPct)}
          accent={totals.pnl >= 0 ? "#10b981" : "#f43f5e"}
        />
        <BigStat label="Positions" value={String(positions.length)} accent="#a78bfa" />
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Card className="overflow-hidden">
          <div className="border-b border-border/60 px-5 py-3">
            <h3 className="text-sm font-semibold tracking-tight">Asset allocation</h3>
            <p className="text-[11px] text-subtle">By instrument type</p>
          </div>
          <div className="p-5">
            <AllocationDonut data={kindSlices} />
          </div>
        </Card>

        <Card className="overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Positions</h3>
              <p className="text-[11px] text-subtle">Sorted by market value</p>
            </div>
            <span className="text-[11px] text-subtle">{positions.length} holdings</span>
          </div>
          <div className="hidden grid-cols-[auto_1fr_120px_140px_120px] gap-3 border-b border-border/60 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-subtle md:grid">
            <span />
            <span>Asset</span>
            <span className="text-right">Allocation</span>
            <span className="text-right">P&amp;L</span>
            <span className="text-right">Value</span>
          </div>
          <div className="divide-y divide-border/60">
            {positions.map((p) => {
              const Icon = KIND_ICON[p.kind];
              const color = KIND_COLOR[p.kind];
              const positive = p.pnl >= 0;
              return (
                <div
                  key={p.symbol}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-5 py-3 md:grid-cols-[auto_1fr_120px_140px_120px]"
                >
                  <div
                    className="grid size-9 place-items-center rounded-lg ring-1"
                    style={{
                      background: `${color}1a`,
                      color,
                      boxShadow: `inset 0 0 0 1px ${color}33`,
                    }}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{p.symbol}</p>
                      <Badge tone="neutral" className="hidden sm:inline-flex">
                        {KIND_LABEL[p.kind]}
                      </Badge>
                    </div>
                    <p className="truncate text-[11px] text-subtle">{p.name}</p>
                  </div>
                  <div className="hidden text-right text-xs text-muted-foreground md:block">
                    <div className="tabular font-semibold text-foreground">{p.allocation.toFixed(1)}%</div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.05]">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${p.allocation}%`, background: color }}
                      />
                    </div>
                  </div>
                  <div className="hidden flex-col items-end md:flex">
                    <span className={`tabular text-sm font-semibold ${positive ? "text-positive" : "text-negative"}`}>
                      {positive ? "+" : ""}
                      {formatCurrency(p.pnl)}
                    </span>
                    <Delta value={p.pnlPct} className="mt-0.5" />
                  </div>
                  <span className="text-right tabular text-sm font-semibold">
                    {formatCurrency(p.value)}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

function BigStat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  return (
    <Card className="relative overflow-hidden p-4">
      <div
        className="pointer-events-none absolute -right-6 -top-6 size-20 rounded-full opacity-25 blur-2xl"
        style={{ background: accent }}
      />
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="tabular mt-1 text-xl font-semibold">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-subtle">{sub}</p>}
    </Card>
  );
}
