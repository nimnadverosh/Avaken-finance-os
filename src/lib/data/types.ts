/**
 * Domain model for Avaken Finance OS.
 * `entity` is the core dimension: every record belongs to "personal" or "avaken".
 * The "consolidated" view is a computed union of both.
 */

export type Entity = "personal" | "avaken" | "consolidated";

export type AccountType = "business" | "current" | "savings" | "investment" | "credit";

export interface Account {
  id: string;
  name: string;
  institution: string;
  type: AccountType;
  entity: Exclude<Entity, "consolidated">;
  balance: number;
  currency: "GBP" | "USD";
  last4: string;
  accent: string;
}

export type TxnType = "income" | "expense" | "payout" | "transfer" | "vat" | "tax";

export interface Transaction {
  id: string;
  date: string; // ISO
  description: string;
  counterparty: string;
  amount: number; // positive = inflow, negative = outflow
  category: string;
  type: TxnType;
  entity: Exclude<Entity, "consolidated">;
  accountId: string;
  vat: number; // VAT component of the amount (0 if none / personal)
  aiCategorised: boolean;
  status: "cleared" | "pending";
}

export type Cadence = "monthly" | "annual" | "weekly";

export interface Subscription {
  id: string;
  name: string;
  vendor: string;
  amount: number; // per cadence
  cadence: Cadence;
  category: string;
  aiCategory: string;
  entity: Exclude<Entity, "consolidated">;
  nextRenewal: string;
  status: "active" | "trial" | "paused";
  accent: string;
}

export interface TikTokAccount {
  id: string;
  handle: string;
  niche: string;
  followers: number;
  revenue: number; // GMV-driven commission this month
  commission: number; // %
  orders: number;
  conversion: number; // %
  status: "scaling" | "stable" | "warming" | "at-risk";
  spark: number[];
  delta: number; // % vs last month
}

export interface VatPeriod {
  quarter: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  salesExVat: number;
  vatOnSales: number; // output VAT
  purchasesExVat: number;
  vatOnPurchases: number; // input / reclaimable VAT
  status: "open" | "filed" | "due";
}

export interface PortfolioPosition {
  symbol: string;
  name: string;
  value: number;
  allocation: number; // %
  pnl: number;
  pnlPct: number;
  kind: "stock" | "crypto" | "etf";
}

export interface SeriesPoint {
  label: string;
  revenue?: number;
  expenses?: number;
  net?: number;
  personal?: number;
  avaken?: number;
  inflow?: number;
  outflow?: number;
  value?: number;
}

export interface Insight {
  id: string;
  title: string;
  body: string;
  severity: "positive" | "warning" | "info";
  tag: string;
}

export interface CategorySlice {
  name: string;
  value: number;
  color: string;
}

export interface AuditEntry {
  id: string;
  at: string; // ISO timestamp
  actor: string;
  action: string;
  entity: Exclude<Entity, "consolidated">;
  ref: string;
  summary: string;
}

export interface PayrollPlan {
  salary: number; // annual gross
  dividends: number; // annual planned
}
