import { isClientReady } from "@/lib/client-ready";
import { getAllAccountsBase } from "./accounts-store";
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

/** Seed + custom accounts with screenshot-synced balances applied on the client. */
export function getLedgerAccounts(): Account[] {
  hydrateFromStorage();
  return getAllAccountsBase().map((a) => ({
    ...a,
    balance: balanceOverlay[a.id] ?? a.balance,
  }));
}

export function mockAccountBalanceOverrideCount(): number {
  hydrateFromStorage();
  return Object.keys(balanceOverlay).length;
}

export function applyMockAccountBalances(updates: HermesAccountBalance[]): void {
  if (updates.length === 0) return;
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
  hydrateFromStorage();
  const removed = Object.keys(balanceOverlay).length;
  balanceOverlay = {};
  persistOverlay();
  notifyAccountsChanged();
  return removed;
}

/** Set one or more account balances without redistributing totals. */
export function setAccountBalances(updates: Record<string, number>): void {
  if (Object.keys(updates).length === 0) return;
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
