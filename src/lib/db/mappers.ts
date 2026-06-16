import type {
  Account,
  PortfolioPosition,
  Subscription,
  TikTokAccount,
  Transaction,
  TxnType,
  VatPeriod,
} from "@/lib/data/types";
import type {
  accounts,
  portfolioPositions,
  subscriptions,
  tiktokAccounts,
  transactions,
  vatPeriods,
} from "@/db/schema";

type DbAccount = typeof accounts.$inferSelect;
type DbTransaction = typeof transactions.$inferSelect;
type DbSubscription = typeof subscriptions.$inferSelect;
type DbTikTokAccount = typeof tiktokAccounts.$inferSelect;
type DbVatPeriod = typeof vatPeriods.$inferSelect;
type DbPortfolioPosition = typeof portfolioPositions.$inferSelect;

export function mapAccount(row: DbAccount): Account {
  return {
    id: row.slug ?? row.id,
    name: row.name,
    institution: row.institution,
    type: row.type,
    entity: row.entity,
    balance: Number(row.balance),
    currency: row.currency as Account["currency"],
    last4: row.last4 ?? "—",
    accent: row.accent ?? "#8b909e",
  };
}

export function mapTransaction(row: DbTransaction, accountSlugById: Map<string, string>): Transaction {
  const accountId = row.accountId
    ? (accountSlugById.get(row.accountId) ?? row.accountId)
    : "";

  return {
    id: row.id,
    date: row.date,
    description: row.description,
    counterparty: row.counterparty ?? "Unknown",
    amount: Number(row.amount),
    category: row.category,
    type: row.type as TxnType,
    entity: row.entity,
    accountId,
    vat: Number(row.vat),
    aiCategorised: row.aiCategorised,
    status: (row.status as Transaction["status"]) ?? "cleared",
  };
}

export function mapSubscription(row: DbSubscription): Subscription {
  return {
    id: row.id,
    name: row.name,
    vendor: row.vendor,
    amount: Number(row.amount),
    cadence: row.cadence,
    category: row.category,
    aiCategory: row.aiCategory ?? row.category,
    entity: row.entity,
    nextRenewal: row.nextRenewal ?? "",
    status: row.status,
    accent: row.accent ?? "#8b909e",
  };
}

export function mapTikTokAccount(row: DbTikTokAccount): TikTokAccount {
  return {
    id: row.id,
    handle: row.handle,
    niche: row.niche ?? "",
    followers: row.followers,
    revenue: Number(row.revenue),
    commission: Number(row.commission ?? 0),
    orders: row.orders,
    conversion: Number(row.conversion ?? 0),
    status: row.status as TikTokAccount["status"],
    spark: [],
    delta: 0,
    payTo: row.payTo,
  };
}

export function mapVatPeriod(row: DbVatPeriod): VatPeriod {
  return {
    quarter: row.quarter,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    dueDate: row.dueDate,
    salesExVat: Number(row.salesExVat),
    vatOnSales: Number(row.vatOnSales),
    purchasesExVat: Number(row.purchasesExVat),
    vatOnPurchases: Number(row.vatOnPurchases),
    status: row.status,
  };
}

export function mapPortfolioPosition(row: DbPortfolioPosition): PortfolioPosition {
  return {
    symbol: row.symbol,
    name: row.name,
    value: Number(row.value),
    allocation: Number(row.allocation ?? 0),
    pnl: Number(row.pnl),
    pnlPct: Number(row.pnlPct ?? 0),
    kind: row.kind as PortfolioPosition["kind"],
  };
}
