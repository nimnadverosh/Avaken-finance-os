"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Download, FileBarChart2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KpiCard } from "./kpi-card";
import { HermesChat } from "./hermes-chat";
import { PersonalSummaryCards } from "./personal-summary-cards";
import { ReserveGauge } from "./reserve-gauge";
import { AccountsStrip } from "./accounts-strip";
import { AffiliatesLeaderboard } from "./affiliates-leaderboard";
import { TransactionsFeed } from "./transactions-feed";
import { InsightsPanel } from "./insights-panel";
import { PeriodToggle, type Period } from "./period-toggle";
import { MonthPicker } from "./month-picker";
import { SectionHeader } from "./section";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { CashflowChart } from "@/components/charts/cashflow-chart";
import { ExpenseDonut } from "@/components/charts/expense-donut";
import { useEntity } from "@/lib/entity-context";
import { useMockDataVersion } from "@/hooks/use-mock-data-version";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  getAccounts,
  getCashflowSeries,
  getExpenseBreakdown,
  getInsights,
  getKpis,
  getReserves,
  getRevenueSeries,
  listUploadedMonths,
  periodLabel,
  recentTransactions,
  topAffiliates,
} from "@/lib/data/queries";
import { getTikTokDashboardModel } from "@/lib/tiktok/dashboard";
import { hasTikTokUploads } from "@/lib/tiktok/store";
import type { TikTokPeriodSelection } from "@/lib/tiktok/period";

export function Dashboard() {
  const { entity, config } = useEntity();
  const mockDataVersion = useMockDataVersion();
  const [period, setPeriod] = useState<Period>("all");
  const [monthKey, setMonthKey] = useState<string | undefined>();
  const [today, setToday] = useState<string>("");

  const uploadedMonths = useMemo(() => listUploadedMonths(), [mockDataVersion]);

  useEffect(() => {
    setToday(formatDate(new Date(), { day: "numeric", month: "long", year: "numeric" }));
  }, []);

  useEffect(() => {
    if (period === "month" && uploadedMonths.length > 0 && !monthKey) {
      setMonthKey(uploadedMonths[0]!.monthKey);
    }
  }, [period, uploadedMonths, monthKey]);

  const selection: TikTokPeriodSelection = useMemo(
    () => ({
      period,
      monthKey: period === "month" ? monthKey : undefined,
    }),
    [period, monthKey],
  );

  const kpis = useMemo(() => getKpis(entity, selection), [entity, mockDataVersion, selection]);
  const revenueSeries = useMemo(
    () => getRevenueSeries(entity, selection),
    [entity, mockDataVersion, selection],
  );
  const cashflowSeries = useMemo(
    () => getCashflowSeries(entity, selection),
    [entity, mockDataVersion, selection],
  );
  const expenseBreakdown = useMemo(
    () => getExpenseBreakdown(entity, selection),
    [entity, mockDataVersion, selection],
  );
  const reserves = getReserves(entity);
  const accounts = useMemo(() => getAccounts(entity), [entity, mockDataVersion]);
  const affiliates = useMemo(() => topAffiliates(5, selection), [mockDataVersion, selection]);
  const txns = useMemo(() => recentTransactions(entity, 7), [entity, mockDataVersion]);
  const insights = useMemo(() => getInsights(entity, 4), [entity, mockDataVersion]);
  const tiktokModel = useMemo(() => getTikTokDashboardModel(), [mockDataVersion]);
  const periodDesc = periodLabel(selection);

  const showAffiliates = entity === "avaken" || entity === "consolidated";
  const showBalanceSummary = entity === "personal" || entity === "consolidated";

  return (
    <div className="space-y-8">
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
                    {" "}
                    · <span className="text-foreground">{today}</span>
                  </>
                )}
                {hasTikTokUploads() && (
                  <>
                    {" "}
                    · <span className="text-primary">{periodDesc}</span>
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PeriodToggle value={period} onChange={setPeriod} />
            {period === "month" && uploadedMonths.length > 0 && (
              <MonthPicker months={uploadedMonths} value={monthKey} onChange={setMonthKey} />
            )}
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

        <HermesChat />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {kpis.map((k, i) => (
            <KpiCard key={k.id} kpi={k} index={i} />
          ))}
        </div>
      </section>

      {showBalanceSummary && (
        <section className="space-y-3">
          <SectionHeader
            title="Balances"
            description="From your daily morning update · bank cash vs credit card debt."
          />
          <PersonalSummaryCards entity={entity} />
        </section>
      )}

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

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Revenue vs net profit</h3>
              <p className="text-[11px] text-subtle">
                {tiktokModel
                  ? `${revenueSeries.length} month${revenueSeries.length === 1 ? "" : "s"} · ${periodDesc}`
                  : "Upload TikTok reports to populate"}
              </p>
            </div>
            <Legend
              items={[
                { color: "#10b981", label: "Revenue" },
                { color: "#a78bfa", label: "Net" },
              ]}
            />
          </div>
          <div className="px-3 pb-3 pt-2">
            {revenueSeries.length > 0 ? (
              <RevenueChart data={revenueSeries} />
            ) : (
              <EmptyChart message="Upload monthly TikTok earnings reports to see your revenue history." />
            )}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Expense mix</h3>
              <p className="text-[11px] text-subtle">{periodDesc}</p>
            </div>
          </div>
          <div className="p-5">
            {expenseBreakdown.length > 0 ? (
              <ExpenseDonut data={expenseBreakdown} />
            ) : (
              <EmptyChart message="Earnings type breakdown appears after you upload reports." compact />
            )}
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Cashflow</h3>
              <p className="text-[11px] text-subtle">Inflow vs outflow · {periodDesc}</p>
            </div>
            <Legend
              items={[
                { color: "#10b981", label: "Inflow" },
                { color: "#f43f5e", label: "Outflow" },
              ]}
            />
          </div>
          <div className="px-3 pb-3 pt-2">
            {cashflowSeries.length > 0 ? (
              <CashflowChart data={cashflowSeries} />
            ) : (
              <EmptyChart message="Cashflow chart fills in as you add monthly uploads." />
            )}
          </div>
        </Card>

        {!hasTikTokUploads() && (
          <Card className="overflow-hidden xl:col-span-1">
            <div className="border-b border-border/60 px-5 py-3">
              <h3 className="text-sm font-semibold tracking-tight">Net worth</h3>
              <p className="text-[11px] text-subtle">From bank balances</p>
            </div>
            <div className="p-5 text-center text-sm text-muted-foreground">
              Net worth trend uses demo data until daily balance updates are logged.
            </div>
          </Card>
        )}
      </section>

      <section>
        <SectionHeader
          title="Accounts"
          description={`All ${config.label.toLowerCase()} accounts, real-time balances.`}
        />
        <AccountsStrip accounts={accounts} />
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        {showAffiliates && (
          <div className="xl:col-span-2">
            <AffiliatesLeaderboard accounts={affiliates} periodLabel={periodDesc} />
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

function EmptyChart({ message, compact }: { message: string; compact?: boolean }) {
  return (
    <div
      className={`flex items-center justify-center text-center text-sm text-muted-foreground ${compact ? "py-8" : "py-16"}`}
    >
      {message}
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
