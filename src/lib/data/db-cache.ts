import type {
  Account,
  PortfolioPosition,
  Subscription,
  TikTokAccount,
  Transaction,
  VatPeriod,
} from "./types";
import type { TikTokAffiliateProfile } from "@/lib/tiktok/accounts";
import type { TikTokUploadRecord } from "@/lib/tiktok/types";
import type { PlannerTask } from "@/lib/planner/types";

export const DB_LEDGER_CHANGED = "avaken-db-ledger-changed";

let enabled = false;
let accounts: Account[] = [];
let transactions: Transaction[] = [];
let subscriptions: Subscription[] = [];
let tiktokAccounts: TikTokAccount[] = [];
let vatPeriods: VatPeriod[] = [];
let portfolio: PortfolioPosition[] = [];
let affiliateProfiles: TikTokAffiliateProfile[] = [];
let tiktokUploads: TikTokUploadRecord[] = [];
let plannerTasks: PlannerTask[] = [];

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

export function getDbAffiliateProfiles(): TikTokAffiliateProfile[] {
  return affiliateProfiles;
}

export function getDbTikTokUploads(): TikTokUploadRecord[] {
  return tiktokUploads;
}

export function getDbPlannerTasks(): PlannerTask[] {
  return plannerTasks;
}

export function applyDbLedgerSnapshot(snapshot: {
  enabled: boolean;
  accounts?: Account[];
  transactions?: Transaction[];
  subscriptions?: Subscription[];
  tiktokAccounts?: TikTokAccount[];
  vatPeriods?: VatPeriod[];
  portfolio?: PortfolioPosition[];
  affiliateProfiles?: TikTokAffiliateProfile[];
  tiktokUploads?: TikTokUploadRecord[];
  plannerTasks?: PlannerTask[];
}): void {
  enabled = snapshot.enabled;
  if (!enabled) return;

  accounts = snapshot.accounts ?? [];
  transactions = snapshot.transactions ?? [];
  subscriptions = snapshot.subscriptions ?? [];
  tiktokAccounts = snapshot.tiktokAccounts ?? [];
  vatPeriods = snapshot.vatPeriods ?? [];
  portfolio = snapshot.portfolio ?? [];
  affiliateProfiles = snapshot.affiliateProfiles ?? [];
  tiktokUploads = snapshot.tiktokUploads ?? [];
  plannerTasks = snapshot.plannerTasks ?? [];
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
      affiliateProfiles?: TikTokAffiliateProfile[];
      tiktokUploads?: TikTokUploadRecord[];
      plannerTasks?: PlannerTask[];
    };
    applyDbLedgerSnapshot(data);
    return data.enabled;
  } catch {
    return false;
  }
}

const MIGRATION_KEY = "avaken-db-migrated";

/** One-time localStorage → Postgres migration after DB is enabled. */
export async function migrateLocalStorageToDb(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!isDbLedgerEnabled()) return;
  if (localStorage.getItem(MIGRATION_KEY)) return;

  const payload: Record<string, unknown> = {};

  try {
    const customRaw = localStorage.getItem("avaken-custom-accounts");
    if (customRaw) payload.customAccounts = JSON.parse(customRaw);
  } catch {
    /* skip */
  }

  try {
    const balancesRaw = localStorage.getItem("avaken-mock-account-balances");
    if (balancesRaw) payload.balanceOverlay = JSON.parse(balancesRaw);
  } catch {
    /* skip */
  }

  try {
    const affiliatesRaw = localStorage.getItem("avaken-tiktok-accounts");
    if (affiliatesRaw) payload.tiktokAffiliates = JSON.parse(affiliatesRaw);
  } catch {
    /* skip */
  }

  try {
    const uploadsRaw = localStorage.getItem("avaken-tiktok-uploads");
    if (uploadsRaw) payload.tiktokUploads = JSON.parse(uploadsRaw);
  } catch {
    /* skip */
  }

  try {
    const plannerRaw = localStorage.getItem("avaken.planner.v2");
    if (plannerRaw) {
      const parsed = JSON.parse(plannerRaw) as { tasks?: PlannerTask[] };
      if (parsed.tasks?.length) payload.plannerTasks = parsed.tasks;
    }
  } catch {
    /* skip */
  }

  const hasData = Object.keys(payload).length > 0;
  if (!hasData) {
    localStorage.setItem(MIGRATION_KEY, "1");
    return;
  }

  try {
    const res = await fetch("/api/migrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      localStorage.setItem(MIGRATION_KEY, "1");
      await refreshDbLedger();
    }
  } catch {
    /* retry on next load */
  }
}
