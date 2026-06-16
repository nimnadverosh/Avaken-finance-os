import { desc, eq } from "drizzle-orm";
import { db, hasDatabase } from "@/db/index";
import {
  accounts,
  portfolioPositions,
  subscriptions,
  tiktokAccounts,
  transactions,
  vatPeriods,
} from "@/db/schema";
import type {
  Account,
  Entity,
  PortfolioPosition,
  Subscription,
  TikTokAccount,
  Transaction,
  VatPeriod,
} from "@/lib/data/types";
import {
  mapAccount,
  mapPortfolioPosition,
  mapSubscription,
  mapTikTokAccount,
  mapTransaction,
  mapVatPeriod,
} from "./mappers";

export interface LedgerSnapshot {
  accounts: Account[];
  transactions: Transaction[];
  subscriptions: Subscription[];
  tiktokAccounts: TikTokAccount[];
  vatPeriods: VatPeriod[];
  portfolio: PortfolioPosition[];
}

async function accountSlugMap(): Promise<Map<string, string>> {
  const rows = await db.select({ id: accounts.id, slug: accounts.slug }).from(accounts);
  const map = new Map<string, string>();
  for (const row of rows) {
    map.set(row.id, row.slug ?? row.id);
  }
  return map;
}

export async function readLedgerSnapshot(): Promise<LedgerSnapshot | null> {
  if (!hasDatabase()) return null;

  const slugById = await accountSlugMap();

  const [accountRows, txnRows, subRows, ttRows, vatRows, portfolioRows] = await Promise.all([
    db.select().from(accounts).orderBy(accounts.entity, accounts.name),
    db.select().from(transactions).orderBy(desc(transactions.date), desc(transactions.createdAt)),
    db.select().from(subscriptions).orderBy(subscriptions.entity, subscriptions.name),
    db.select().from(tiktokAccounts).orderBy(tiktokAccounts.handle),
    db.select().from(vatPeriods).orderBy(desc(vatPeriods.periodStart)),
    db.select().from(portfolioPositions).orderBy(desc(portfolioPositions.value)),
  ]);

  return {
    accounts: accountRows.map(mapAccount),
    transactions: txnRows.map((row) => mapTransaction(row, slugById)),
    subscriptions: subRows.map(mapSubscription),
    tiktokAccounts: ttRows.map(mapTikTokAccount),
    vatPeriods: vatRows.map(mapVatPeriod),
    portfolio: portfolioRows.map(mapPortfolioPosition),
  };
}

export function filterByEntity<T extends { entity: Exclude<Entity, "consolidated"> }>(
  rows: T[],
  entity: Entity,
): T[] {
  if (entity === "consolidated") return rows;
  return rows.filter((r) => r.entity === entity);
}

export async function resolveAccountUuidBySlug(slug: string): Promise<string | null> {
  if (!hasDatabase()) return null;
  const [row] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.slug, slug))
    .limit(1);
  return row?.id ?? null;
}
