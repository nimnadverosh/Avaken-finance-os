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
import { getConsolidatedFinancialSummary, getPersonalFinancialSummary } from "./personal-summary";
import { corpTax, type CorpTaxBreakdown } from "@/lib/tax/uk-corp-tax";
import { ukPersonalTax, type TaxBreakdown } from "@/lib/tax/uk-income-tax";
import { isRealDataMode } from "./real-data-mode";
import {
  getTikTokDashboardModel,
  tiktokAffiliatesFromAccounts,
  tiktokCashflowSeries,
  tiktokExpenseBreakdown,
  tiktokInsights,
  tiktokPeriodNet,
  tiktokPeriodRevenue,
  tiktokRevenueSeries,
} from "@/lib/tiktok/dashboard";
import { hasAffiliateAccounts } from "@/lib/tiktok/accounts";
import { hasTikTokUploads } from "@/lib/tiktok/store";
import {
  effectiveTaxSelection,
  getFilteredUploads,
  periodDelta,
  periodLabel,
  sumUploadOrders,
  taxPeriodLabel,
  type TikTokPeriodSelection,
} from "@/lib/tiktok/period";
import { clampDelta } from "@/lib/tiktok/model";
import { getAffiliatePortfolioInsights } from "@/lib/tiktok/affiliate-insights";
import { formatCurrency } from "@/lib/format";

export type { TikTokPeriodSelection };
export { periodLabel, listUploadedMonths } from "@/lib/tiktok/period";

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
  const ledger = getLedgerAccounts();
  if (entity === "personal") {
    return sum(
      inEntity(ledger, entity)
        .filter((a) => a.type !== "investment" && a.type !== "credit")
        .map((a) => a.balance),
    );
  }
  if (entity === "avaken") {
    return sum(
      inEntity(ledger, entity)
        .filter((a) => a.type !== "credit")
        .map((a) => a.balance),
    );
  }
  return sum(
    ledger
      .filter((a) => a.type !== "investment" && a.type !== "credit")
      .map((a) => a.balance),
  );
}

export function netWorth(entity: Entity): number {
  const ledger = getLedgerAccounts();
  const etoro = ledger.find((a) => a.id === "etoro")?.balance ?? 0;

  if (entity === "personal") {
    return getPersonalFinancialSummary().netPosition + etoro;
  }
  if (entity === "avaken") {
    return sum(
      inEntity(ledger, entity)
        .filter((a) => a.type !== "credit")
        .map((a) => a.balance),
    );
  }
  return getConsolidatedFinancialSummary().totalNetPosition + etoro;
}

/* ---- Revenue / expense series, entity aware ---- */
export function getRevenueSeries(
  entity: Entity,
  selection: TikTokPeriodSelection = { period: "all" },
): SeriesPoint[] {
  const model = getTikTokDashboardModel();
  if (model) {
    if (entity === "avaken") return tiktokRevenueSeries(model, "avaken", selection);
    if (entity === "personal") return tiktokRevenueSeries(model, "personal", selection);
    return tiktokRevenueSeries(model, "consolidated", selection);
  }

  if (isRealDataMode()) return [];

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
  const personal = getRevenueSeries("personal", selection);
  return revenueSeries.map((p, i) => ({
    label: p.label,
    revenue: p.revenue! + personal[i].revenue!,
    expenses: p.expenses! + personal[i].expenses!,
    net: p.net! + personal[i].net!,
  }));
}

export function getCashflowSeries(
  entity: Entity,
  selection: TikTokPeriodSelection = { period: "all" },
): SeriesPoint[] {
  const model = getTikTokDashboardModel();
  if (model) {
    if (entity === "avaken") return tiktokCashflowSeries(model, "avaken", selection);
    if (entity === "personal") return tiktokCashflowSeries(model, "personal", selection);
    return tiktokCashflowSeries(model, "consolidated", selection);
  }

  if (isRealDataMode()) return [];

  if (entity === "avaken") return cashflowSeries;
  if (entity === "personal") {
    const rev = getRevenueSeries("personal", selection);
    return rev.map((p) => ({ label: p.label, inflow: p.revenue!, outflow: -p.expenses! }));
  }
  const personal = getCashflowSeries("personal", selection);
  return cashflowSeries.map((p, i) => ({
    label: p.label,
    inflow: p.inflow! + personal[i].inflow!,
    outflow: p.outflow! + personal[i].outflow!,
  }));
}

export function getNetWorthSeries(): SeriesPoint[] {
  if (isRealDataMode()) return [];
  return netWorthSeries.map((p) => ({ ...p, value: p.personal! + p.avaken! }));
}

export function getExpenseBreakdown(
  entity: Entity,
  selection: TikTokPeriodSelection = { period: "all" },
): CategorySlice[] {
  const model = getTikTokDashboardModel();
  if (model) {
    if (entity === "consolidated") return tiktokExpenseBreakdown(model, selection);
    const uploads = getFilteredUploads(selection);
    const hasEntityIncome = uploads.some((u) =>
      entity === "personal" ? u.summary.personal.revenue > 0 : u.summary.company.revenue > 0,
    );
    if (hasEntityIncome) return tiktokExpenseBreakdown(model, selection);
    return [];
  }

  if (isRealDataMode()) return [];
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

export function vatNetDue(selection?: TikTokPeriodSelection): number {
  const model = getTikTokDashboardModel();
  if (model) {
    const sel = selection ?? effectiveTaxSelection();
    return Math.round(
      getFilteredUploads(sel).reduce((s, u) => s + u.summary.company.vatOnSales, 0) * 100,
    ) / 100;
  }
  if (isRealDataMode()) return 0;
  const p = currentVatPeriod();
  return p.vatOnSales - p.vatOnPurchases;
}

/* ---- Tax ---- */
/** Avaken profit — from uploaded TikTok months when available, else mock. */
export function avakenAnnualProfit(selection?: TikTokPeriodSelection): number {
  const model = getTikTokDashboardModel();
  if (model) {
    const sel = selection ?? effectiveTaxSelection();
    return sum(tiktokRevenueSeries(model, "avaken", sel).map((r) => r.net!));
  }
  if (isRealDataMode()) return 0;
  return sum(revenueSeries.map((r) => r.net!));
}

export function corpTaxEstimate(selection?: TikTokPeriodSelection): CorpTaxBreakdown {
  return corpTax(avakenAnnualProfit(selection));
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
  const taxSel = effectiveTaxSelection();
  const vatEst = vatNetDue(taxSel);
  const corpEst = corpTaxEstimate(taxSel).tax;
  const taxLabel = taxPeriodLabel();
  const profit = avakenAnnualProfit(taxSel);

  return [
    {
      label: "VAT Reserve",
      reserved: vatReserve,
      estimated: vatEst,
      coverage: vatEst === 0 ? 1 : vatReserve / vatEst,
      accent: "#f59e0b",
      accountName: "Tide · VAT Reserve",
      hint: hasTikTokUploads()
        ? `${taxLabel} · output VAT ${formatCurrency(vatEst, { decimals: 0 })} from uploads`
        : `Q4 estimate £${Math.round(vatEst).toLocaleString()} · due ${new Date(currentVatPeriod().dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
    },
    {
      label: "Corp Tax Reserve",
      reserved: corpReserve,
      estimated: corpEst,
      coverage: corpEst === 0 ? 1 : corpReserve / corpEst,
      accent: "#a78bfa",
      accountName: "Tide · Corp Tax Reserve",
      hint: hasTikTokUploads()
        ? `${taxLabel} · on £${Math.round(profit).toLocaleString()} company profit (${corpTaxEstimate(taxSel).band} rate)`
        : `On rolling £${Math.round(profit).toLocaleString()} profit (${corpTaxEstimate(taxSel).band} rate band)`,
    },
  ];
}

/* ---- Subscriptions ---- */
export function monthlySubscriptionSpend(entity: Entity): number {
  if (isRealDataMode()) return 0;
  return sum(
    inEntity(subscriptions, entity).map((s) => {
      if (s.cadence === "annual") return s.amount / 12;
      if (s.cadence === "weekly") return s.amount * 4.33;
      return s.amount;
    }),
  );
}

/* ---- Affiliate ---- */
function effectiveAffiliates(
  selection: TikTokPeriodSelection = { period: "all" },
): TikTokAccount[] {
  if (hasTikTokUploads() || hasAffiliateAccounts()) {
    return tiktokAffiliatesFromAccounts(selection);
  }
  if (isRealDataMode()) return [];
  return tiktokAccounts;
}

export function affiliateRevenue(
  selection: TikTokPeriodSelection = { period: "all" },
): number {
  if (hasTikTokUploads()) {
    return tiktokPeriodRevenue("consolidated", selection);
  }
  return sum(effectiveAffiliates(selection).map((t) => t.revenue));
}

export function topAffiliates(
  limit = 6,
  selection: TikTokPeriodSelection = { period: "all" },
): TikTokAccount[] {
  return [...effectiveAffiliates(selection)].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
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
  if (isRealDataMode()) return [];
  return inEntity(subscriptions, entity).slice().sort((a, b) => b.amount - a.amount);
}

export function subscriptionsByCategory(entity: Entity): CategorySlice[] {
  if (isRealDataMode()) return [];
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
  if (isRealDataMode()) return [];
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
  if (isRealDataMode()) return [];
  return [...vatPeriods].sort((a, b) => +new Date(b.periodStart) - +new Date(a.periodStart));
}

/* ---- TikTok ---- */
export function allAffiliates(
  selection: TikTokPeriodSelection = { period: "all" },
): TikTokAccount[] {
  return [...effectiveAffiliates(selection)];
}

/* ---- Portfolio ---- */
export function getPortfolio(): PortfolioPosition[] {
  if (isRealDataMode()) return [];
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
  if (isRealDataMode()) {
    const sel = effectiveTaxSelection();
    const personalIncome = tiktokPeriodRevenue("personal", sel);
    return ukPersonalTax(Math.min(personalIncome, 12570), Math.max(0, personalIncome - 12570));
  }
  return ukPersonalTax(payrollPlan.salary, payrollPlan.dividends);
}

export function getPayrollPlan() {
  if (isRealDataMode()) {
    return { salary: 0, dividends: 0 };
  }
  return payrollPlan;
}

/* ---- Audit log ---- */
export function getAuditLog(entity: Entity, limit = 20): AuditEntry[] {
  if (isRealDataMode()) return [];
  return inEntity(auditLog, entity)
    .slice()
    .sort((a, b) => +new Date(b.at) - +new Date(a.at))
    .slice(0, limit);
}

/* ---- Insights ---- */
export function getInsights(entity: Entity, limit = 4): Insight[] {
  const model = getTikTokDashboardModel();
  if (model) {
    const base = tiktokInsights(model, entity).filter((i) => {
      if (entity === "personal") return i.tag !== "VAT";
      if (entity === "avaken") return i.tag !== "Tax";
      return true;
    });
    const portfolio = getAffiliatePortfolioInsights();
    const seen = new Set(base.map((i) => i.id));
    const merged = [...base, ...portfolio.filter((i) => !seen.has(i.id))];
    return merged.slice(0, limit);
  }

  if (isRealDataMode()) return [];

  const filtered = insights.filter((i) => {
    if (entity === "consolidated") return true;
    if (entity === "personal") return i.tag === "Subscriptions";
    return true;
  });
  return filtered.slice(0, limit);
}

/* ---- KPI deck for dashboard ---- */
export function getKpis(
  entity: Entity,
  selection: TikTokPeriodSelection = { period: "all" },
): Kpi[] {
  const model = getTikTokDashboardModel();
  const rev = getRevenueSeries(entity, selection);
  const e =
    entity === "consolidated" ? "consolidated" : entity === "avaken" ? "avaken" : "personal";

  let lastRevenue: number;
  let lastNet: number;
  let lastOrders: number;
  let revDelta: number;
  let netDelta: number;
  let revSpark: number[];
  let netSpark: number[];
  let revenueSub = periodLabel(selection);

  if (model) {
    lastRevenue = tiktokPeriodRevenue(e, selection);
    lastNet = tiktokPeriodNet(e, selection);
    lastOrders = sumUploadOrders(getFilteredUploads(selection));
    const uploads = getFilteredUploads(selection);
    revDelta = clampDelta(periodDelta(uploads, e));
    const prevSelection =
      selection.period === "latest" && model.previous
        ? clampDelta(
            model.previous.grossRevenue
              ? ((model.latest.grossRevenue - model.previous.grossRevenue) /
                  model.previous.grossRevenue) *
                100
              : 0,
          )
        : revDelta;
    netDelta = prevSelection;
    revSpark = rev.map((p) => p.revenue!);
    netSpark = rev.map((p) => p.net!);
    revenueSub = `${periodLabel(selection)} · ${lastOrders.toLocaleString()} orders`;
  } else if (isRealDataMode()) {
    lastRevenue = 0;
    lastNet = 0;
    lastOrders = 0;
    revDelta = 0;
    netDelta = 0;
    revSpark = [];
    netSpark = [];
    revenueSub = "Upload TikTok reports";
  } else {
    lastOrders = 0;
    const last = rev[rev.length - 1];
    const prev = rev[rev.length - 2];
    lastRevenue = last?.revenue ?? 0;
    lastNet = last?.net ?? 0;
    revDelta = clampDelta(prev?.revenue ? ((last.revenue! - prev.revenue!) / prev.revenue!) * 100 : 0);
    netDelta = clampDelta(prev?.net ? ((last.net! - prev.net!) / prev.net!) * 100 : 0);
    revSpark = rev.slice(-7).map((p) => p.revenue!);
    netSpark = rev.slice(-7).map((p) => p.net!);
  }

  const cash = cashBalance(entity);
  const nw = netWorth(entity);
  const subs = monthlySubscriptionSpend(entity);
  const dailySnapshot = getDailyFinancialSnapshot();

  const nwSpark = isRealDataMode()
    ? []
    : (entity === "consolidated"
        ? netWorthSeries.map((p) => p.personal! + p.avaken!)
        : netWorthSeries.map((p) => (entity === "personal" ? p.personal! : p.avaken!))
      ).slice(-7);

  const marginPct = lastRevenue > 0 ? Math.round((lastNet / lastRevenue) * 100) : 0;

  const base: Kpi[] = [
    {
      id: "revenue",
      label: entity === "personal" ? "TikTok income" : "TikTok revenue",
      value: lastRevenue,
      format: "currency",
      delta: revDelta,
      spark: revSpark.length > 0 ? revSpark : [0],
      accent: "#10b981",
      sub: revenueSub,
    },
    {
      id: "net",
      label: "Net profit",
      value: lastNet,
      format: "currency",
      delta: netDelta,
      spark: netSpark.length > 0 ? netSpark : [0],
      accent: "#34d399",
      sub: lastRevenue > 0 ? `${marginPct}% margin · est. costs` : "after est. costs",
    },
    {
      id: "cash",
      label: "Cash on Hand",
      value: cash,
      format: "currency",
      delta: 0,
      spark: nwSpark.length > 0 ? nwSpark.map((v) => v * 0.4) : [cash],
      accent: "#38bdf8",
      sub: dailySnapshot ? "from morning update" : `${inEntity(getLedgerAccounts(), entity).length} accounts`,
    },
    {
      id: "networth",
      label: "Net Worth",
      value: nw,
      format: "currency",
      delta: 0,
      spark: nwSpark.length > 0 ? nwSpark : [nw],
      accent: "#a78bfa",
      sub: dailySnapshot ? "includes daily balances" : "total equity",
    },
  ];

  if (entity === "avaken" || entity === "consolidated") {
    if (!isRealDataMode()) {
      base.push({
        id: "vat",
        label: "VAT Due (Q4)",
        value: vatNetDue(),
        format: "currency",
        delta: 0,
        spark: vatPeriods.map((p) => p.vatOnSales - p.vatOnPurchases),
        accent: "#f59e0b",
        sub: `due ${new Date(currentVatPeriod().dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
      });
    } else if (model) {
      base.push({
        id: "vat",
        label: "Output VAT",
        value: vatNetDue(effectiveTaxSelection()),
        format: "currency",
        delta: 0,
        spark: revSpark,
        accent: "#f59e0b",
        sub: `${taxPeriodLabel()} · company commission`,
      });
    }
    if (!isRealDataMode()) {
      base.push({
        id: "subs",
        label: "Subscriptions / mo",
        value: subs,
        format: "currency",
        delta: 0,
        spark: [subs],
        accent: "#f43f5e",
        sub: `${inEntity(subscriptions, entity).length} active`,
      });
    }
  } else {
    if (!isRealDataMode()) {
      base.push({
        id: "subs",
        label: "Subscriptions / mo",
        value: subs,
        format: "currency",
        delta: 0,
        spark: [subs],
        accent: "#f43f5e",
        sub: `${inEntity(subscriptions, entity).length} active`,
      });
      base.push({
        id: "invest",
        label: "Portfolio Value",
        value: getLedgerAccounts().find((a) => a.id === "etoro")!.balance,
        format: "currency",
        delta: 0,
        spark: [getLedgerAccounts().find((a) => a.id === "etoro")!.balance],
        accent: "#22c55e",
        sub: "eToro",
      });
    }
  }

  return base;
}

export { VAT_RATE };
