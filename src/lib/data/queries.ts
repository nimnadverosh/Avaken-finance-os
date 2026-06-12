import type {
  Account,
  AuditEntry,
  CategorySlice,
  Entity,
  Insight,
  PortfolioPosition,
  SeriesPoint,
  Subscription,
  TikTokAccount,
  Transaction,
  VatPeriod,
} from "./types";
import {
  accounts,
  auditLog,
  avakenExpenseBreakdown,
  cashflowSeries,
  insights,
  netWorthSeries,
  payrollPlan,
  personalExpenseBreakdown,
  portfolio,
  revenueSeries,
  subscriptions,
  tiktokAccounts,
  vatPeriods,
} from "./mock";
import { getLedgerAccounts } from "./mock-account-balances";
import { getLedgerTransactions } from "./mock-ledger";
import { getDailyFinancialSnapshot } from "./daily-updates";
import { getConsolidatedFinancialSummary } from "./personal-summary";
import { corpTax, type CorpTaxBreakdown } from "@/lib/tax/uk-corp-tax";
import { ukPersonalTax, type TaxBreakdown } from "@/lib/tax/uk-income-tax";
import {
  getTikTokDashboardModel,
  tiktokInsights,
  tiktokRevenueSeries,
  tiktokScaledAffiliates,
} from "@/lib/tiktok/dashboard";
import { clampDelta } from "@/lib/tiktok/model";

const VAT_RATE = 0.2;

export interface Kpi {
  id: string;
  label: string;
  value: number;
  format: "currency" | "number" | "percent";
  delta: number; // % MoM
  spark: number[];
  accent: string;
  sub?: string;
}

function sum(ns: number[]) {
  return ns.reduce((a, b) => a + b, 0);
}

function inEntity<T extends { entity: "personal" | "avaken" }>(items: T[], entity: Entity): T[] {
  if (entity === "consolidated") return items;
  return items.filter((i) => i.entity === entity);
}

/* ---- Balances ---- */
export function cashBalance(entity: Entity): number {
  const snapshot = getDailyFinancialSnapshot();
  if (snapshot) {
    if (entity === "personal") return snapshot.personalBankTotal;
    if (entity === "avaken") {
      const reserves = getLedgerAccounts()
        .filter((a) => a.entity === "avaken" && a.id !== "tide")
        .reduce((sum, a) => sum + a.balance, 0);
      return snapshot.avakenTideBalance + reserves;
    }
    const reserves = getLedgerAccounts()
      .filter((a) => a.entity === "avaken" && a.id !== "tide")
      .reduce((sum, a) => sum + a.balance, 0);
    return snapshot.personalBankTotal + snapshot.avakenTideBalance + reserves;
  }

  return sum(
    inEntity(getLedgerAccounts(), entity)
      .filter((a) => a.type !== "investment" && a.type !== "credit")
      .map((a) => a.balance),
  );
}

export function netWorth(entity: Entity): number {
  const snapshot = getDailyFinancialSnapshot();
  if (snapshot) {
    const etoro = getLedgerAccounts().find((a) => a.id === "etoro")?.balance ?? 0;
    if (entity === "personal") return snapshot.netPosition + etoro;
    if (entity === "avaken") {
      const reserves = getLedgerAccounts()
        .filter((a) => a.entity === "avaken" && a.id !== "tide")
        .reduce((sum, a) => sum + a.balance, 0);
      return snapshot.avakenTideBalance + reserves;
    }
    return getConsolidatedFinancialSummary().totalNetPosition + etoro;
  }

  const latest = netWorthSeries[netWorthSeries.length - 1];
  if (entity === "personal") return latest.personal!;
  if (entity === "avaken") return latest.avaken!;
  return latest.personal! + latest.avaken!;
}

/* ---- Revenue / expense series, entity aware ---- */
export function getRevenueSeries(entity: Entity): SeriesPoint[] {
  // When monthly TikTok reports have been uploaded, drive the whole revenue
  // picture from them (smart-adjusted, entity-split) instead of the seed series.
  const model = getTikTokDashboardModel();
  if (model) {
    if (entity === "avaken") return tiktokRevenueSeries(model, "avaken");
    if (entity === "personal") {
      // Personal TikTok share on top of a steady salary/other-income baseline.
      const PERSONAL_BASELINE_REVENUE = 1200;
      const PERSONAL_BASELINE_EXPENSE = 900;
      return tiktokRevenueSeries(model, "personal").map((p) => {
        const revenue = p.revenue! + PERSONAL_BASELINE_REVENUE;
        const expenses = p.expenses! + PERSONAL_BASELINE_EXPENSE;
        return { label: p.label, revenue, expenses, net: revenue - expenses };
      });
    }
    const av = getRevenueSeries("avaken");
    const pe = getRevenueSeries("personal");
    return av.map((p, i) => ({
      label: p.label,
      revenue: p.revenue! + pe[i].revenue!,
      expenses: p.expenses! + pe[i].expenses!,
      net: p.net! + pe[i].net!,
    }));
  }

  if (entity === "avaken") return revenueSeries;
  if (entity === "personal") {
    // Personal income = salary + investment growth proxy
    return netWorthSeries.map((p, i) => {
      const prev = i > 0 ? netWorthSeries[i - 1].personal! : p.personal!;
      const gain = Math.max(0, p.personal! - prev);
      const revenue = 1100 + gain;
      const expenses = 3200 + (i % 3) * 180;
      return { label: p.label, revenue, expenses, net: revenue - expenses };
    });
  }
  // consolidated
  const personal = getRevenueSeries("personal");
  return revenueSeries.map((p, i) => ({
    label: p.label,
    revenue: p.revenue! + personal[i].revenue!,
    expenses: p.expenses! + personal[i].expenses!,
    net: p.net! + personal[i].net!,
  }));
}

export function getCashflowSeries(entity: Entity): SeriesPoint[] {
  if (entity === "avaken") return cashflowSeries;
  if (entity === "personal") {
    const rev = getRevenueSeries("personal");
    return rev.map((p) => ({ label: p.label, inflow: p.revenue!, outflow: -p.expenses! }));
  }
  const personal = getCashflowSeries("personal");
  return cashflowSeries.map((p, i) => ({
    label: p.label,
    inflow: p.inflow! + personal[i].inflow!,
    outflow: p.outflow! + personal[i].outflow!,
  }));
}

export function getNetWorthSeries(): SeriesPoint[] {
  return netWorthSeries.map((p) => ({ ...p, value: p.personal! + p.avaken! }));
}

export function getExpenseBreakdown(entity: Entity): CategorySlice[] {
  if (entity === "personal") return personalExpenseBreakdown;
  if (entity === "avaken") return avakenExpenseBreakdown;
  // merge by name
  const map = new Map<string, CategorySlice>();
  [...avakenExpenseBreakdown, ...personalExpenseBreakdown].forEach((s) => {
    const existing = map.get(s.name);
    if (existing) existing.value += s.value;
    else map.set(s.name, { ...s });
  });
  return [...map.values()].sort((a, b) => b.value - a.value);
}

/* ---- VAT ---- */
export function currentVatPeriod() {
  return vatPeriods.find((p) => p.status === "open") ?? vatPeriods[vatPeriods.length - 1];
}

export function vatNetDue(): number {
  const p = currentVatPeriod();
  return p.vatOnSales - p.vatOnPurchases;
}

/* ---- Tax ---- */
/** Avaken FY profit (rolling 12m of mock series). Real engine will use the company's accounting period. */
export function avakenAnnualProfit(): number {
  return sum(revenueSeries.map((r) => r.net!));
}

export function corpTaxEstimate(): CorpTaxBreakdown {
  return corpTax(avakenAnnualProfit());
}

export interface Reserve {
  label: string;
  reserved: number;
  estimated: number;
  coverage: number; // reserved / estimated (1 = exactly covered)
  accent: string;
  accountName: string;
  hint: string;
}

export function getReserves(entity: Entity): Reserve[] {
  if (entity === "personal") return [];
  const ledger = getLedgerAccounts();
  const vatReserve = ledger.find((a) => a.id === "tide-vat")!.balance;
  const corpReserve = ledger.find((a) => a.id === "tide-tax")!.balance;
  const vatEst = vatNetDue();
  const corpEst = corpTaxEstimate().tax;

  return [
    {
      label: "VAT Reserve",
      reserved: vatReserve,
      estimated: vatEst,
      coverage: vatEst === 0 ? 1 : vatReserve / vatEst,
      accent: "#f59e0b",
      accountName: "Tide · VAT Reserve",
      hint: `Q4 estimate £${Math.round(vatEst).toLocaleString()} · due ${new Date(currentVatPeriod().dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
    },
    {
      label: "Corp Tax Reserve",
      reserved: corpReserve,
      estimated: corpEst,
      coverage: corpEst === 0 ? 1 : corpReserve / corpEst,
      accent: "#a78bfa",
      accountName: "Tide · Corp Tax Reserve",
      hint: `On rolling £${Math.round(avakenAnnualProfit()).toLocaleString()} profit (${corpTaxEstimate().band} rate band)`,
    },
  ];
}

/* ---- Subscriptions ---- */
export function monthlySubscriptionSpend(entity: Entity): number {
  return sum(
    inEntity(subscriptions, entity).map((s) => {
      if (s.cadence === "annual") return s.amount / 12;
      if (s.cadence === "weekly") return s.amount * 4.33;
      return s.amount;
    }),
  );
}

/* ---- Affiliate ---- */
/** The six TikTok accounts, rescaled to the latest upload's company revenue when present. */
function effectiveAffiliates(): TikTokAccount[] {
  const model = getTikTokDashboardModel();
  return model ? tiktokScaledAffiliates(model) : tiktokAccounts;
}

export function affiliateRevenue(): number {
  return sum(effectiveAffiliates().map((t) => t.revenue));
}

export function topAffiliates(limit = 6): TikTokAccount[] {
  return [...effectiveAffiliates()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

/* ---- Accounts strip ---- */
export function getAccounts(entity: Entity): Account[] {
  return inEntity(getLedgerAccounts(), entity);
}

/* ---- Recent transactions ---- */
export function recentTransactions(entity: Entity, limit = 8): Transaction[] {
  return inEntity(getLedgerTransactions(), entity)
    .slice()
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .slice(0, limit);
}

/* ---- Subscriptions ---- */
export function listSubscriptions(entity: Entity): Subscription[] {
  return inEntity(subscriptions, entity).slice().sort((a, b) => b.amount - a.amount);
}

export function subscriptionsByCategory(entity: Entity): CategorySlice[] {
  const palette = ["#10b981", "#34d399", "#38bdf8", "#a78bfa", "#f59e0b", "#f43f5e", "#22d3ee", "#fb7185"];
  const map = new Map<string, number>();
  inEntity(subscriptions, entity).forEach((s) => {
    const m = s.cadence === "annual" ? s.amount / 12 : s.cadence === "weekly" ? s.amount * 4.33 : s.amount;
    map.set(s.category, (map.get(s.category) ?? 0) + m);
  });
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({ name, value, color: palette[i % palette.length] }));
}

export function upcomingRenewals(entity: Entity, days = 30): Subscription[] {
  const now = new Date();
  const horizon = new Date(now.getTime() + days * 86400_000);
  return inEntity(subscriptions, entity)
    .filter((s) => s.nextRenewal && new Date(s.nextRenewal) <= horizon)
    .sort((a, b) => +new Date(a.nextRenewal) - +new Date(b.nextRenewal));
}

/* ---- Transactions ---- */
export function listTransactions(
  entity: Entity,
  filters: { type?: Transaction["type"]; q?: string } = {},
): Transaction[] {
  let rows = inEntity(getLedgerTransactions(), entity).slice();
  if (filters.type) rows = rows.filter((t) => t.type === filters.type);
  if (filters.q) {
    const q = filters.q.toLowerCase();
    rows = rows.filter(
      (t) =>
        t.description.toLowerCase().includes(q) ||
        t.counterparty.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q),
    );
  }
  return rows.sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

/* ---- VAT ---- */
export function listVatPeriods(): VatPeriod[] {
  return [...vatPeriods].sort((a, b) => +new Date(b.periodStart) - +new Date(a.periodStart));
}

/* ---- TikTok ---- */
export function allAffiliates(): TikTokAccount[] {
  return [...effectiveAffiliates()];
}

/* ---- Portfolio ---- */
export function getPortfolio(): PortfolioPosition[] {
  return [...portfolio].sort((a, b) => b.value - a.value);
}

export function portfolioTotals() {
  const value = portfolio.reduce((a, p) => a + p.value, 0);
  const pnl = portfolio.reduce((a, p) => a + p.pnl, 0);
  const cost = value - pnl;
  const pnlPct = cost === 0 ? 0 : (pnl / cost) * 100;
  return { value, pnl, cost, pnlPct };
}

/* ---- Personal income tax ---- */
export function personalTaxEstimate(): TaxBreakdown {
  return ukPersonalTax(payrollPlan.salary, payrollPlan.dividends);
}

export function getPayrollPlan() {
  return payrollPlan;
}

/* ---- Audit log ---- */
export function getAuditLog(entity: Entity, limit = 20): AuditEntry[] {
  return inEntity(auditLog, entity)
    .slice()
    .sort((a, b) => +new Date(b.at) - +new Date(a.at))
    .slice(0, limit);
}

/* ---- Insights ---- */
export function getInsights(entity: Entity, limit = 4): Insight[] {
  // Surface freshly-derived TikTok insights first when reports are uploaded.
  const model = getTikTokDashboardModel();
  const dynamic = model && entity !== "personal" ? tiktokInsights(model) : [];

  const filtered = insights.filter((i) => {
    if (entity === "consolidated") return true;
    if (entity === "personal") return i.tag === "Subscriptions";
    return true;
  });
  return [...dynamic, ...filtered].slice(0, limit);
}

/* ---- KPI deck for dashboard ---- */
export function getKpis(entity: Entity): Kpi[] {
  const rev = getRevenueSeries(entity);
  const last = rev[rev.length - 1];
  const prev = rev[rev.length - 2];
  // Clamp to a sane band so a breakout upload month (small base → huge %) reads realistically.
  const revDelta = clampDelta(prev.revenue ? ((last.revenue! - prev.revenue!) / prev.revenue!) * 100 : 0);
  const netDelta = clampDelta(prev.net ? ((last.net! - prev.net!) / prev.net!) * 100 : 0);

  const cash = cashBalance(entity);
  const nw = netWorth(entity);
  const subs = monthlySubscriptionSpend(entity);
  const dailySnapshot = getDailyFinancialSnapshot();

  const revSpark = rev.slice(-7).map((p) => p.revenue!);
  const netSpark = rev.slice(-7).map((p) => p.net!);
  const nwSpark = (entity === "consolidated"
    ? netWorthSeries.map((p) => p.personal! + p.avaken!)
    : netWorthSeries.map((p) => (entity === "personal" ? p.personal! : p.avaken!))
  ).slice(-7);

  const base: Kpi[] = [
    {
      id: "revenue",
      label: entity === "personal" ? "Income (MTD)" : "Revenue (MTD)",
      value: last.revenue!,
      format: "currency",
      delta: revDelta,
      spark: revSpark,
      accent: "#10b981",
      sub: "vs last month",
    },
    {
      id: "net",
      label: "Net Profit (MTD)",
      value: last.net!,
      format: "currency",
      delta: netDelta,
      spark: netSpark,
      accent: "#34d399",
      sub: `${Math.round((last.net! / last.revenue!) * 100)}% margin`,
    },
    {
      id: "cash",
      label: "Cash on Hand",
      value: cash,
      format: "currency",
      delta: 5.4,
      spark: nwSpark.map((v) => v * 0.4),
      accent: "#38bdf8",
      sub: dailySnapshot ? "from morning update" : `${inEntity(getLedgerAccounts(), entity).length} accounts`,
    },
    {
      id: "networth",
      label: "Net Worth",
      value: nw,
      format: "currency",
      delta: 3.1,
      spark: nwSpark,
      accent: "#a78bfa",
      sub: dailySnapshot ? "includes daily balances" : "total equity",
    },
  ];

  if (entity === "avaken" || entity === "consolidated") {
    base.push({
      id: "vat",
      label: "VAT Due (Q4)",
      value: vatNetDue(),
      format: "currency",
      delta: -2.8,
      spark: vatPeriods.map((p) => p.vatOnSales - p.vatOnPurchases),
      accent: "#f59e0b",
      sub: `due ${new Date(currentVatPeriod().dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
    });
    base.push({
      id: "subs",
      label: "Subscriptions / mo",
      value: subs,
      format: "currency",
      delta: 1.2,
      spark: [780, 800, 815, 830, 845, 860, subs],
      accent: "#f43f5e",
      sub: `${inEntity(subscriptions, entity).length} active`,
    });
  } else {
    base.push({
      id: "subs",
      label: "Subscriptions / mo",
      value: subs,
      format: "currency",
      delta: 0,
      spark: [60, 62, 65, 68, 70, 71, subs],
      accent: "#f43f5e",
      sub: `${inEntity(subscriptions, entity).length} active`,
    });
    base.push({
      id: "invest",
      label: "Portfolio Value",
      value: getLedgerAccounts().find((a) => a.id === "etoro")!.balance,
      format: "currency",
      delta: 8.7,
      spark: [31, 32.4, 33.8, 35.1, 36.6, 37.9, 38.9],
      accent: "#22c55e",
      sub: "eToro",
    });
  }

  return base;
}

export { VAT_RATE };
