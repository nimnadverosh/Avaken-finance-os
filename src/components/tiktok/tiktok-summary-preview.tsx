"use client";

import { Building2, Package, Percent, Receipt, TrendingUp, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Sparkline } from "@/components/ui/sparkline";
import { formatCurrency, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { attributionLabel } from "@/lib/tiktok/model";
import type {
  ParsedTikTokReport,
  TikTokGroupTotal,
  TikTokMonthlySummary,
  TikTokUploadRecord,
} from "@/lib/tiktok/types";

/** Read-only preview of a modelled month: headline KPIs, attribution, breakdowns, trend. */
export function TikTokSummaryPreview({
  summary,
  report,
}: {
  summary: TikTokMonthlySummary;
  report: ParsedTikTokReport;
}) {
  const maxDay = Math.max(1, ...summary.daily.map((d) => d.revenue));
  const isCompany = summary.split.company >= 1;
  const attributed = isCompany ? summary.company : summary.personal;
  const accent = isCompany ? "#10b981" : "#38bdf8";
  const Icon = isCompany ? Building2 : User;

  return (
    <div className="space-y-5">
      {/* Headline KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi icon={TrendingUp} label="Gross commission" value={formatCurrency(summary.grossRevenue, { decimals: 2 })} accent="#10b981" />
        <Kpi icon={Receipt} label="Net profit" value={formatCurrency(summary.netProfit, { decimals: 2 })} accent="#34d399" sub={`${summary.marginPct}% margin`} />
        <Kpi icon={Package} label="Orders" value={formatNumber(summary.orderCount)} accent="#a78bfa" sub={`${report.lineCount} lines`} />
        <Kpi
          icon={Percent}
          label="Output VAT"
          value={formatCurrency(isCompany ? summary.company.vatOnSales : 0, { decimals: 2 })}
          accent="#f59e0b"
        />
        <Kpi icon={TrendingUp} label="Avg order value" value={formatCurrency(summary.avgOrderValue, { decimals: 2 })} accent="#38bdf8" />
      </div>

      {/* Automatic attribution */}
      <Card className={cn("relative overflow-hidden p-5")}>
        <div className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full opacity-20 blur-3xl" style={{ background: accent }} />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl" style={{ background: `${accent}22`, color: accent }}>
              <Icon className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">100% {attributionLabel(summary.split)}</p>
              <p className="text-[11px] text-subtle">
                {isCompany ? "Jul 2026 and later → Avaken Ltd" : "Before Jul 2026 → Personal"}
              </p>
            </div>
          </div>
          <p className="tabular text-xl font-semibold" style={{ color: accent }}>
            {formatCurrency(attributed.revenue, { decimals: 2 })}
          </p>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Tile label="Net" value={formatCurrency(attributed.netProfit, { decimals: 0 })} />
          <Tile label="Orders" value={formatNumber(attributed.orders)} />
          <Tile label="VAT" value={formatCurrency(attributed.vatOnSales, { decimals: 0 })} />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Daily trend */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Daily commission</h3>
              <p className="text-[11px] text-subtle">{summary.periodLabel} · {summary.daily.length} active days</p>
            </div>
            <Sparkline data={summary.daily.map((d) => d.revenue)} color="#10b981" width={120} height={34} />
          </div>
          <div className="mt-4 flex items-end gap-0.5" style={{ height: 88 }}>
            {summary.daily.map((d) => (
              <div
                key={d.date}
                title={`Day ${d.label}: ${formatCurrency(d.revenue, { decimals: 2 })}`}
                className="flex-1 rounded-t bg-gradient-to-t from-primary/30 to-primary transition-all hover:opacity-80"
                style={{ height: `${Math.max(4, (d.revenue / maxDay) * 100)}%` }}
              />
            ))}
          </div>
        </Card>

        {/* By earnings type */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold tracking-tight">By earnings type</h3>
          <div className="mt-3 space-y-2.5">
            {summary.byType.map((t) => {
              const pct = (t.revenue / Math.max(summary.grossRevenue, 0.01)) * 100;
              return (
                <div key={t.name}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{t.name}</span>
                    <span className="tabular font-semibold">{formatCurrency(t.revenue, { decimals: 2 })}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-emerald" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Top brands */}
      <Card className="overflow-hidden">
        <div className="border-b border-border/60 px-5 py-3">
          <h3 className="text-sm font-semibold tracking-tight">Top paying brands</h3>
          <p className="text-[11px] text-subtle">Sellers paying you the most commission this month</p>
        </div>
        <div className="divide-y divide-border/60">
          {summary.topBrands.slice(0, 6).map((b, i) => (
            <div key={b.name} className="flex items-center justify-between gap-3 px-5 py-2.5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-white/[0.04] text-[11px] font-semibold tabular text-subtle">
                  {i + 1}
                </span>
                <span className="truncate text-sm">{b.name}</span>
              </div>
              <div className="flex items-center gap-4 text-right">
                <span className="hidden text-[11px] text-subtle sm:inline">{b.orders} orders</span>
                <span className="tabular text-sm font-semibold">{formatCurrency(b.revenue, { decimals: 2 })}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {report.warnings.length > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning/[0.05] px-4 py-3 text-[12px] text-warning">
          {report.warnings.map((w, i) => (
            <p key={i}>{w}</p>
          ))}
        </div>
      )}
    </div>
  );
}

/** Same chart layout as a single month, aggregated across all uploads for one account. */
export function TikTokLifetimePreview({
  uploads,
  handle,
}: {
  uploads: TikTokUploadRecord[];
  handle: string;
}) {
  if (uploads.length === 0) return null;

  const sorted = [...uploads].sort((a, b) =>
    a.summary.monthKey.localeCompare(b.summary.monthKey),
  );
  const grossRevenue = round2(sorted.reduce((s, u) => s + u.summary.grossRevenue, 0));
  const netProfit = round2(sorted.reduce((s, u) => s + u.summary.netProfit, 0));
  const orderCount = sorted.reduce((s, u) => s + u.summary.orderCount, 0);
  const lineCount = sorted.reduce((s, u) => s + u.report.lineCount, 0);
  const marginPct = grossRevenue > 0 ? round2((netProfit / grossRevenue) * 100) : 0;
  const avgOrderValue = orderCount > 0 ? round2(grossRevenue / orderCount) : 0;
  const outputVat = round2(
    sorted.reduce((s, u) => s + (u.summary.split.company >= 1 ? u.summary.company.vatOnSales : 0), 0),
  );
  const companyRevenue = round2(
    sorted.reduce(
      (s, u) => s + (u.summary.split.company >= 1 ? u.summary.company.revenue : 0),
      0,
    ),
  );
  const personalRevenue = round2(
    sorted.reduce(
      (s, u) => s + (u.summary.split.personal >= 1 ? u.summary.personal.revenue : 0),
      0,
    ),
  );
  const companyMonths = sorted.filter((u) => u.summary.split.company >= 1).length;
  const personalMonths = sorted.length - companyMonths;
  const byType = mergeGroupTotals(sorted.map((u) => u.summary.byType));
  const topBrands = mergeGroupTotals(sorted.map((u) => u.summary.topBrands)).slice(0, 6);
  const maxMonth = Math.max(1, ...sorted.map((u) => u.summary.grossRevenue));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi
          icon={TrendingUp}
          label="Lifetime gross"
          value={formatCurrency(grossRevenue, { decimals: 2 })}
          accent="#10b981"
          sub={`${sorted.length} month${sorted.length === 1 ? "" : "s"}`}
        />
        <Kpi
          icon={Receipt}
          label="Lifetime net"
          value={formatCurrency(netProfit, { decimals: 2 })}
          accent="#34d399"
          sub={`${marginPct}% margin`}
        />
        <Kpi
          icon={Package}
          label="Orders"
          value={formatNumber(orderCount)}
          accent="#a78bfa"
          sub={`${lineCount} lines`}
        />
        <Kpi
          icon={Percent}
          label="Output VAT"
          value={formatCurrency(outputVat, { decimals: 2 })}
          accent="#f59e0b"
        />
        <Kpi
          icon={TrendingUp}
          label="Avg order value"
          value={formatCurrency(avgOrderValue, { decimals: 2 })}
          accent="#38bdf8"
        />
      </div>

      <Card className="relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full bg-violet/20 opacity-20 blur-3xl" />
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Lifetime attribution · {handle}</p>
            <p className="text-[11px] text-subtle">
              {companyMonths > 0 && personalMonths > 0
                ? `${companyMonths} company month${companyMonths === 1 ? "" : "s"} · ${personalMonths} personal`
                : companyMonths > 0
                  ? "Jul 2026+ reports → Avaken Ltd"
                  : "Pre–Jul 2026 reports → Personal"}
            </p>
          </div>
          <p className="tabular text-xl font-semibold text-emerald">
            {formatCurrency(grossRevenue, { decimals: 2 })}
          </p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
          {companyRevenue > 0 && (
            <Tile label="Avaken Ltd" value={formatCurrency(companyRevenue, { decimals: 0 })} />
          )}
          {personalRevenue > 0 && (
            <Tile label="Personal" value={formatCurrency(personalRevenue, { decimals: 0 })} />
          )}
          <Tile label="Net" value={formatCurrency(netProfit, { decimals: 0 })} />
          <Tile label="Orders" value={formatNumber(orderCount)} />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Monthly commission</h3>
              <p className="text-[11px] text-subtle">
                {sorted.length} uploaded month{sorted.length === 1 ? "" : "s"}
              </p>
            </div>
            <Sparkline
              data={sorted.map((u) => u.summary.grossRevenue)}
              color="#10b981"
              width={120}
              height={34}
            />
          </div>
          <div className="mt-4 flex items-end gap-1" style={{ height: 88 }}>
            {sorted.map((u) => (
              <div
                key={u.summary.monthKey}
                title={`${u.summary.periodLabel}: ${formatCurrency(u.summary.grossRevenue, { decimals: 2 })}`}
                className="flex-1 rounded-t bg-gradient-to-t from-primary/30 to-primary transition-all hover:opacity-80"
                style={{
                  height: `${Math.max(4, (u.summary.grossRevenue / maxMonth) * 100)}%`,
                }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between gap-1 text-[9px] text-subtle">
            {sorted.map((u) => (
              <span key={u.summary.monthKey} className="flex-1 truncate text-center">
                {u.summary.shortMonth}
              </span>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold tracking-tight">By earnings type</h3>
          <div className="mt-3 space-y-2.5">
            {byType.map((t) => {
              const pct = (t.revenue / Math.max(grossRevenue, 0.01)) * 100;
              return (
                <div key={t.name}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{t.name}</span>
                    <span className="tabular font-semibold">
                      {formatCurrency(t.revenue, { decimals: 2 })}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-emerald"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-border/60 px-5 py-3">
          <h3 className="text-sm font-semibold tracking-tight">Top paying brands</h3>
          <p className="text-[11px] text-subtle">Across all uploaded months for this account</p>
        </div>
        <div className="divide-y divide-border/60">
          {topBrands.map((b, i) => (
            <div key={b.name} className="flex items-center justify-between gap-3 px-5 py-2.5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-white/[0.04] text-[11px] font-semibold tabular text-subtle">
                  {i + 1}
                </span>
                <span className="truncate text-sm">{b.name}</span>
              </div>
              <div className="flex items-center gap-4 text-right">
                <span className="hidden text-[11px] text-subtle sm:inline">{b.orders} orders</span>
                <span className="tabular text-sm font-semibold">
                  {formatCurrency(b.revenue, { decimals: 2 })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function mergeGroupTotals(groups: TikTokGroupTotal[][]): TikTokGroupTotal[] {
  const map = new Map<string, { revenue: number; orders: number }>();
  for (const list of groups) {
    for (const item of list) {
      const existing = map.get(item.name);
      if (existing) {
        existing.revenue += item.revenue;
        existing.orders += item.orders;
      } else {
        map.set(item.name, { revenue: item.revenue, orders: item.orders });
      }
    }
  }
  return [...map.entries()]
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function Kpi({
  icon: Icon,
  label,
  value,
  accent,
  sub,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
  accent: string;
  sub?: string;
}) {
  return (
    <Card className="relative overflow-hidden p-4">
      <div className="pointer-events-none absolute -right-6 -top-6 size-20 rounded-full opacity-20 blur-2xl" style={{ background: accent }} />
      <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
        <Icon className="size-3.5" style={{ color: accent }} />
        {label}
      </div>
      <p className="tabular mt-1.5 text-lg font-semibold">{value}</p>
      {sub && <p className="text-[11px] text-subtle">{sub}</p>}
    </Card>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] py-2 ring-1 ring-white/5">
      <p className="text-[10px] uppercase tracking-wide text-subtle">{label}</p>
      <p className="tabular text-xs font-semibold">{value}</p>
    </div>
  );
}
