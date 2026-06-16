import type {
  Account,
  PortfolioPosition,
  Subscription,
  TikTokAccount,
  Transaction,
  VatPeriod,
} from "./types";

export const DB_LEDGER_CHANGED = "avaken-db-ledger-changed";

let enabled = false;
let accounts: Account[] = [];
let transactions: Transaction[] = [];
let subscriptions: Subscription[] = [];
let tiktokAccounts: TikTokAccount[] = [];
let vatPeriods: VatPeriod[] = [];
let portfolio: PortfolioPosition[] = [];

function notifyChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DB_LEDGER_CHANGED));
}

export function isDbLedgerEnabled(): boolean {
  return enabled;
}

export function getDbAccounts(): Account[] {
  return accounts;
}

export function getDbTransactions(): Transaction[] {
  return transactions;
}

export function getDbSubscriptions(): Subscription[] {
  return subscriptions;
}

export function getDbTikTokAccounts(): TikTokAccount[] {
  return tiktokAccounts;
}

export function getDbVatPeriods(): VatPeriod[] {
  return vatPeriods;
}

export function getDbPortfolio(): PortfolioPosition[] {
  return portfolio;
}

export function applyDbLedgerSnapshot(snapshot: {
  enabled: boolean;
  accounts?: Account[];
  transactions?: Transaction[];
  subscriptions?: Subscription[];
  tiktokAccounts?: TikTokAccount[];
  vatPeriods?: VatPeriod[];
  portfolio?: PortfolioPosition[];
}): void {
  enabled = snapshot.enabled;
  if (!enabled) return;

  accounts = snapshot.accounts ?? [];
  transactions = snapshot.transactions ?? [];
  subscriptions = snapshot.subscriptions ?? [];
  tiktokAccounts = snapshot.tiktokAccounts ?? [];
  vatPeriods = snapshot.vatPeriods ?? [];
  portfolio = snapshot.portfolio ?? [];
  notifyChanged();
}

export async function refreshDbLedger(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    const res = await fetch("/api/data/ledger", { cache: "no-store" });
    if (!res.ok) return false;
    const data = (await res.json()) as {
      enabled: boolean;
      accounts?: Account[];
      transactions?: Transaction[];
      subscriptions?: Subscription[];
      tiktokAccounts?: TikTokAccount[];
      vatPeriods?: VatPeriod[];
      portfolio?: PortfolioPosition[];
    };
    applyDbLedgerSnapshot(data);
    return data.enabled;
  } catch {
    return false;
  }
}
