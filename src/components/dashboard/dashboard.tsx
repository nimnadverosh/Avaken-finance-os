"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Camera, Download, FileBarChart2 } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KpiCard } from "./kpi-card";
import { PersonalSummaryCards } from "./personal-summary-cards";
import { ReserveGauge } from "./reserve-gauge";
import { AccountsStrip } from "./accounts-strip";
import { AffiliatesLeaderboard } from "./affiliates-leaderboard";
import { TransactionsFeed } from "./transactions-feed";
import { ScreenshotImportCta } from "./screenshot-import-cta";
import { InsightsPanel } from "./insights-panel";
import { PeriodToggle, type Period } from "./period-toggle";
import { SectionHeader } from "./section";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { CashflowChart } from "@/components/charts/cashflow-chart";
import { ExpenseDonut } from "@/components/charts/expense-donut";
import { NetWorthChart } from "@/components/charts/networth-chart";
import { useEntity } from "@/lib/entity-context";
import { useMockDataVersion } from "@/hooks/use-mock-data-version";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  getAccounts,
  getCashflowSeries,
  getExpenseBreakdown,
  getInsights,
  getKpis,
  getNetWorthSeries,
  getReserves,
  getRevenueSeries,
  recentTransactions,
  topAffiliates,
} from "@/lib/data/queries";

export function Dashboard() {
  const { entity, config } = useEntity();
  const mockDataVersion = useMockDataVersion();
  const [period, setPeriod] = useState<Period>("MTD");
  const [today, setToday] = useState<string>("");
  useEffect(() => {
    setToday(formatDate(new Date(), { day: "numeric", month: "long", year: "numeric" }));
  }, []);

  const kpis = useMemo(() => getKpis(entity), [entity, mockDataVersion]);
  const revenueSeries = getRevenueSeries(entity);
  const cashflowSeries = getCashflowSeries(entity);
  const expenseBreakdown = getExpenseBreakdown(entity);
  const netWorthSeries = getNetWorthSeries();
  const reserves = getReserves(entity);
  const accounts = useMemo(() => getAccounts(entity), [entity, mockDataVersion]);
  const affiliates = topAffiliates(5);
  const txns = useMemo(() => recentTransactions(entity, 7), [entity, mockDataVersion]);
  const insights = getInsights(entity, 4);

  const showAffiliates = entity === "avaken" || entity === "consolidated";
  const isPersonal = entity === "personal";

  const latestNetWorth =
    entity === "personal"
      ? netWorthSeries[netWorthSeries.length - 1].personal
      : entity === "avaken"
        ? netWorthSeries[netWorthSeries.length - 1].avaken
        : netWorthSeries[netWorthSeries.length - 1].personal! +
          netWorthSeries[netWorthSeries.length - 1].avaken!;

  return (
    <div className="space-y-8">
      {/* ---------- Hero strip ---------- */}
      <section className="space-y-4">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span
              className="size-2 rounded-full"
              style={{ background: config.accent, boxShadow: `0 0 10px ${config.accent}` }}
            />
            <div>
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                <span className="text-gradient">{config.label}</span> overview
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                {config.description}
                {today && (
                  <>
                    {" "}· <span className="text-foreground">{today}</span>
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/import/screenshots"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-[0_0_0_1px_rgba(16,185,129,0.4),0_8px_24px_-8px_rgba(16,185,129,0.5)] transition-all hover:bg-emerald"
            >
              <Camera className="size-3.5" />
              Import screenshots
            </Link>
            <PeriodToggle value={period} onChange={setPeriod} />
            <Button variant="outline" size="sm">
              <Download className="size-3.5" />
              Export
            </Button>
            <Button size="sm">
              <FileBarChart2 className="size-3.5" />
              New report
            </Button>
          </div>
        </div>

        <ScreenshotImportCta />

        {/* ---------- KPI grid ---------- */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {kpis.map((k, i) => (
            <KpiCard key={k.id} kpi={k} index={i} />
          ))}
        </div>
      </section>

      {isPersonal && (
        <section className="space-y-3">
          <SectionHeader
            title="Balances"
            description="Synced from Hermes screenshot imports · bank cash vs credit card debt."
          />
          <PersonalSummaryCards />
        </section>
      )}

      {/* ---------- Reserves (Avaken / Consolidated) ---------- */}
      {reserves.length > 0 && (
        <section>
          <SectionHeader
            title="Tax & VAT reserves"
            description="Cash set aside in Tide reserve accounts vs estimated HMRC liability."
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {reserves.map((r, i) => (
              <ReserveGauge key={r.label} reserve={r} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* ---------- Charts row ---------- */}
      <section className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Revenue vs net profit</h3>
              <p className="text-[11px] text-subtle">Trailing 12 months</p>
            </div>
            <Legend
              items={[
                { color: "#10b981", label: "Revenue" },
                { color: "#a78bfa", label: "Net" },
              ]}
            />
          </div>
          <div className="px-3 pb-3 pt-2">
            <RevenueChart data={revenueSeries} />
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Expense mix</h3>
              <p className="text-[11px] text-subtle">Current month</p>
            </div>
            <button className="text-[11px] text-muted-foreground hover:text-foreground">
              Drill in <ArrowUpRight className="ml-0.5 inline size-3" />
            </button>
          </div>
          <div className="p-5">
            <ExpenseDonut data={expenseBreakdown} />
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Cashflow</h3>
              <p className="text-[11px] text-subtle">Inflow vs outflow per month</p>
            </div>
            <Legend
              items={[
                { color: "#10b981", label: "Inflow" },
                { color: "#f43f5e", label: "Outflow" },
              ]}
            />
          </div>
          <div className="px-3 pb-3 pt-2">
            <CashflowChart data={cashflowSeries} />
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Net worth</h3>
              <p className="text-[11px] text-subtle">
                {formatCurrency(latestNetWorth ?? 0)} today
              </p>
            </div>
            <Legend
              items={[
                ...(entity !== "avaken" ? [{ color: "#38bdf8", label: "Personal" }] : []),
                ...(entity !== "personal" ? [{ color: "#10b981", label: "Avaken" }] : []),
              ]}
            />
          </div>
          <div className="px-3 pb-3 pt-2">
            <NetWorthChart data={netWorthSeries} entity={entity} />
          </div>
        </Card>
      </section>

      {/* ---------- Accounts strip ---------- */}
      <section>
        <SectionHeader
          title="Accounts"
          description={`All ${config.label.toLowerCase()} accounts, real-time balances.`}
        />
        <AccountsStrip accounts={accounts} />
      </section>

      {/* ---------- Affiliates + insights + txns ---------- */}
      <section className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        {showAffiliates && (
          <div className="xl:col-span-2">
            <AffiliatesLeaderboard accounts={affiliates} />
          </div>
        )}
        <div className={showAffiliates ? "" : "xl:col-span-2"}>
          <InsightsPanel insights={insights} />
        </div>
      </section>

      <section>
        <TransactionsFeed transactions={txns} />
      </section>
    </div>
  );
}

function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}
