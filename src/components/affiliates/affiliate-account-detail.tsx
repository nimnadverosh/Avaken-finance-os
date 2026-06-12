"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  ChevronRight,
  Package,
  Percent,
  Receipt,
  TrendingUp,
  User,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkline } from "@/components/ui/sparkline";
import { useMockDataVersion } from "@/hooks/use-mock-data-version";
import { AffiliateInsightsList } from "./affiliate-insights-panel";
import { getAffiliateAccountInsightBundles } from "@/lib/tiktok/affiliate-insights";
import { formatCurrency, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type Tab = "overview" | "monthly" | "alltime";

export function AffiliateAccountDetail({
  accountId,
  onClose,
}: {
  accountId: string;
  onClose: () => void;
}) {
  const version = useMockDataVersion();
  const bundle = useMemo(() => getAffiliateAccountInsightBundles(accountId), [accountId, version]);
  const [tab, setTab] = useState<Tab>("overview");
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | undefined>();

  useEffect(() => {
    if (bundle?.monthly[0]) setSelectedMonthKey(bundle.monthly[0].monthKey);
  }, [bundle]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (!bundle) return null;

  const { handle, niche, metrics, allTime, monthly } = bundle;
  const selectedMonth = monthly.find((m) => m.monthKey === selectedMonthKey) ?? monthly[0];
  const isCompany = metrics.payTo === "company";
  const accent = isCompany ? "#10b981" : "#38bdf8";
  const PayIcon = isCompany ? Building2 : User;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative flex h-full w-full max-w-xl flex-col border-l border-border/60 bg-background/95 shadow-2xl backdrop-blur-xl">
        <div className="shrink-0 border-b border-border/60 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold tracking-tight">{handle}</p>
              <p className="text-[11px] text-subtle">{niche}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="size-9 shrink-0 p-0">
              <X className="size-4" />
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone={isCompany ? "positive" : "info"}>
              {isCompany ? "Avaken Ltd" : "Personal"} payout
            </Badge>
            <Badge tone="info">
              {metrics.uploadCount} month{metrics.uploadCount === 1 ? "" : "s"} uploaded
            </Badge>
          </div>
        </div>

        <div className="flex shrink-0 gap-1 border-b border-border/60 px-5 py-2">
          {(
            [
              ["overview", "Overview"],
              ["monthly", "Monthly"],
              ["alltime", "All time"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors",
                tab === id
                  ? "bg-white/[0.08] text-foreground ring-1 ring-white/10"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === "overview" && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-2">
                <MetricCard
                  icon={TrendingUp}
                  label="All-time gross"
                  value={formatCurrency(metrics.totalRevenue, { decimals: 2 })}
                  accent="#10b981"
                />
                <MetricCard
                  icon={Receipt}
                  label="All-time net"
                  value={formatCurrency(metrics.totalNet, { decimals: 2 })}
                  accent="#34d399"
                  sub={`${metrics.marginPct}% margin`}
                />
                <MetricCard
                  icon={Package}
                  label="Total orders"
                  value={formatNumber(metrics.totalOrders)}
                  accent="#a78bfa"
                />
                <MetricCard
                  icon={Percent}
                  label="Avg / month"
                  value={formatCurrency(metrics.avgMonthlyRevenue, { decimals: 0 })}
                  accent="#38bdf8"
                />
              </div>

              <Card className="relative overflow-hidden p-4">
                <div
                  className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full opacity-20 blur-2xl"
                  style={{ background: accent }}
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="grid size-9 place-items-center rounded-xl"
                      style={{ background: `${accent}22`, color: accent }}
                    >
                      <PayIcon className="size-4" />
                    </span>
                    <p className="text-sm font-semibold">Monthly trend</p>
                  </div>
                  <Sparkline
                    data={monthly.map((m) => m.metrics.grossRevenue).reverse()}
                    color={accent}
                    width={100}
                    height={32}
                  />
                </div>
                <div className="mt-3 space-y-1">
                  {monthly.map((m) => (
                    <button
                      key={m.monthKey}
                      type="button"
                      onClick={() => {
                        setSelectedMonthKey(m.monthKey);
                        setTab("monthly");
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[11px] transition-colors hover:bg-white/[0.04]"
                    >
                      <span className="text-subtle">{m.periodLabel}</span>
                      <span className="flex items-center gap-1 tabular font-medium">
                        {formatCurrency(m.metrics.grossRevenue, { decimals: 0 })}
                        <ChevronRight className="size-3 text-subtle" />
                      </span>
                    </button>
                  ))}
                </div>
              </Card>

              {metrics.topBrand && (
                <Card className="p-4">
                  <p className="text-[11px] font-medium text-muted-foreground">Top brand (all time)</p>
                  <p className="mt-1 text-sm font-semibold">{metrics.topBrand.name}</p>
                  <p className="tabular mt-0.5 text-lg font-semibold text-emerald">
                    {formatCurrency(metrics.topBrand.revenue, { decimals: 2 })}
                  </p>
                  <p className="text-[11px] text-subtle">
                    {metrics.topBrand.share.toFixed(1)}% of lifetime · {metrics.topBrand.orders} orders
                  </p>
                </Card>
              )}

              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-subtle">
                  Latest insights
                </p>
                <AffiliateInsightsList
                  insights={[...allTime.slice(0, 2), ...(selectedMonth?.insights.slice(0, 2) ?? [])]}
                  compact
                />
              </div>
            </div>
          )}

          {tab === "monthly" && selectedMonth && (
            <div className="space-y-5">
              <select
                value={selectedMonth.monthKey}
                onChange={(e) => setSelectedMonthKey(e.target.value)}
                className="h-10 w-full rounded-xl border border-border/60 bg-white/[0.03] px-3 text-sm outline-none focus:border-primary/40"
              >
                {monthly.map((m) => (
                  <option key={m.monthKey} value={m.monthKey}>
                    {m.periodLabel}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-2">
                <MetricCard
                  icon={TrendingUp}
                  label="Gross"
                  value={formatCurrency(selectedMonth.metrics.grossRevenue, { decimals: 2 })}
                  accent="#10b981"
                />
                <MetricCard
                  icon={Receipt}
                  label="Net"
                  value={formatCurrency(selectedMonth.metrics.netProfit, { decimals: 2 })}
                  accent="#34d399"
                  sub={`${selectedMonth.metrics.marginPct}% margin`}
                />
                <MetricCard
                  icon={Package}
                  label="Orders"
                  value={formatNumber(selectedMonth.metrics.orderCount)}
                  accent="#a78bfa"
                />
                <MetricCard
                  icon={Percent}
                  label="AOV"
                  value={formatCurrency(selectedMonth.metrics.avgOrderValue, { decimals: 2 })}
                  accent="#38bdf8"
                />
              </div>

              {selectedMonth.metrics.byType.length > 0 && (
                <Card className="p-4">
                  <p className="text-[11px] font-medium text-muted-foreground">Earnings type mix</p>
                  <div className="mt-3 space-y-2">
                    {selectedMonth.metrics.byType.map((t) => (
                      <BreakdownRow
                        key={t.name}
                        label={t.name}
                        value={t.value}
                        total={selectedMonth.metrics.grossRevenue}
                        color={t.color}
                      />
                    ))}
                  </div>
                </Card>
              )}

              {selectedMonth.metrics.topBrands.length > 0 && (
                <Card className="p-4">
                  <p className="text-[11px] font-medium text-muted-foreground">Top brands</p>
                  <div className="mt-3 space-y-2">
                    {selectedMonth.metrics.topBrands.map((b) => (
                      <div
                        key={b.name}
                        className="flex items-center justify-between text-[11px]"
                      >
                        <span className="truncate pr-2">{b.name}</span>
                        <span className="tabular shrink-0 font-medium">
                          {formatCurrency(b.revenue, { decimals: 0 })} · {b.orders} ord
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-subtle">
                  Monthly insights
                </p>
                <AffiliateInsightsList insights={selectedMonth.insights} compact />
              </div>
            </div>
          )}

          {tab === "alltime" && (
            <div className="space-y-5">
              {metrics.earningTypeMix.length > 0 && (
                <Card className="p-4">
                  <p className="text-[11px] font-medium text-muted-foreground">Lifetime earnings mix</p>
                  <div className="mt-3 space-y-2">
                    {metrics.earningTypeMix.map((t) => (
                      <BreakdownRow
                        key={t.name}
                        label={t.name}
                        value={t.value}
                        total={metrics.totalRevenue}
                        color={t.color}
                      />
                    ))}
                  </div>
                </Card>
              )}

              {metrics.bestMonth && (
                <Card className="p-4">
                  <p className="text-[11px] font-medium text-muted-foreground">Best month</p>
                  <p className="mt-1 font-semibold">{metrics.bestMonth.label}</p>
                  <p className="tabular text-xl font-semibold text-emerald">
                    {formatCurrency(metrics.bestMonth.revenue, { decimals: 2 })}
                  </p>
                </Card>
              )}

              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-subtle">
                  All-time insights
                </p>
                <AffiliateInsightsList insights={allTime} compact />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  accent,
  sub,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  accent: string;
  sub?: string;
}) {
  return (
    <Card className="relative overflow-hidden p-3">
      <div
        className="pointer-events-none absolute -right-4 -top-4 size-14 rounded-full opacity-20 blur-xl"
        style={{ background: accent }}
      />
      <Icon className="size-3.5" style={{ color: accent }} />
      <p className="mt-1 text-[10px] uppercase tracking-wide text-subtle">{label}</p>
      <p className="tabular text-sm font-semibold">{value}</p>
      {sub && <p className="text-[10px] text-subtle">{sub}</p>}
    </Card>
  );
}

function BreakdownRow({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="truncate pr-2">{label}</span>
        <span className="tabular shrink-0 font-medium">{formatCurrency(value, { decimals: 0 })}</span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.05]">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
