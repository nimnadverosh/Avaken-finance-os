import { isClientReady } from "@/lib/client-ready";
import { getAllAccountsBase } from "./accounts-store";
import { isDbLedgerEnabled, refreshDbLedger } from "./db-cache";
import { PERSONAL_CREDIT_ACCOUNT_IDS } from "@/lib/import/account-resolution";
import type { Account } from "./types";
import type { HermesAccountBalance } from "@/lib/hermes/types";

const STORAGE_KEY = "avaken-mock-account-balances";

export const MOCK_ACCOUNTS_CHANGED = "avaken-mock-accounts-changed";

let balanceOverlay: Record<string, number> = {};
let hydrated = false;

function hydrateFromStorage(): void {
  if (hydrated || !isClientReady()) return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      balanceOverlay = parsed as Record<string, number>;
    }
  } catch {
    balanceOverlay = {};
  }
}

function persistOverlay(): void {
  if (typeof window === "undefined") return;
  if (Object.keys(balanceOverlay).length === 0) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(balanceOverlay));
}

function notifyAccountsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(MOCK_ACCOUNTS_CHANGED));
}

/** Seed + custom accounts with balances from DB or localStorage overlay. */
export function getLedgerAccounts(): Account[] {
  if (isDbLedgerEnabled()) {
    return getAllAccountsBase();
  }

  hydrateFromStorage();
  return getAllAccountsBase().map((a) => ({
    ...a,
    balance: balanceOverlay[a.id] ?? a.balance,
  }));
}

export function mockAccountBalanceOverrideCount(): number {
  if (isDbLedgerEnabled()) return 0;
  hydrateFromStorage();
  return Object.keys(balanceOverlay).length;
}

export async function applyMockAccountBalances(updates: HermesAccountBalance[]): Promise<void> {
  if (updates.length === 0) return;

  if (isDbLedgerEnabled()) {
    const map: Record<string, number> = {};
    for (const u of updates) {
      const account = getAllAccountsBase().find((a) => a.id === u.accountId);
      const isCredit =
        u.kind === "credit" ||
        (PERSONAL_CREDIT_ACCOUNT_IDS as readonly string[]).includes(u.accountId) ||
        account?.type === "credit";
      map[u.accountId] = isCredit ? Math.abs(u.balance) : u.balance;
    }
    await fetch("/api/accounts/balances", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates: map }),
    });
    await refreshDbLedger();
    notifyAccountsChanged();
    return;
  }

  hydrateFromStorage();
  for (const u of updates) {
    const account = getAllAccountsBase().find((a) => a.id === u.accountId);
    const isCredit =
      u.kind === "credit" ||
      (PERSONAL_CREDIT_ACCOUNT_IDS as readonly string[]).includes(u.accountId) ||
      account?.type === "credit";
    balanceOverlay[u.accountId] = isCredit ? Math.abs(u.balance) : u.balance;
  }
  persistOverlay();
  notifyAccountsChanged();
}

export function clearMockAccountBalances(): number {
  if (isDbLedgerEnabled()) return 0;
  hydrateFromStorage();
  const removed = Object.keys(balanceOverlay).length;
  balanceOverlay = {};
  persistOverlay();
  notifyAccountsChanged();
  return removed;
}

/** Set one or more account balances without redistributing totals. */
export async function setAccountBalances(updates: Record<string, number>): Promise<void> {
  if (Object.keys(updates).length === 0) return;

  if (isDbLedgerEnabled()) {
    const sanitized: Record<string, number> = {};
    for (const [accountId, balance] of Object.entries(updates)) {
      const account = getAllAccountsBase().find((a) => a.id === accountId);
      if (!account) continue;
      const isCredit =
        account.type === "credit" ||
        (PERSONAL_CREDIT_ACCOUNT_IDS as readonly string[]).includes(accountId);
      sanitized[accountId] = isCredit ? Math.abs(balance) : balance;
    }
    await fetch("/api/accounts/balances", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates: sanitized }),
    });
    await refreshDbLedger();
    notifyAccountsChanged();
    return;
  }

  hydrateFromStorage();
  for (const [accountId, balance] of Object.entries(updates)) {
    const account = getAllAccountsBase().find((a) => a.id === accountId);
    if (!account) continue;
    const isCredit =
      account.type === "credit" ||
      (PERSONAL_CREDIT_ACCOUNT_IDS as readonly string[]).includes(accountId);
    balanceOverlay[accountId] = isCredit ? Math.abs(balance) : balance;
  }
  persistOverlay();
  notifyAccountsChanged();
}
