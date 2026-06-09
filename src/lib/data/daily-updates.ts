import {
  PERSONAL_BANK_ACCOUNT_IDS,
  PERSONAL_CREDIT_ACCOUNT_IDS,
} from "@/lib/import/account-resolution";
import { accounts as seedAccounts } from "./mock";
import { applyMockAccountBalances, getLedgerAccounts } from "./mock-account-balances";
import type { HermesAccountBalance } from "@/lib/hermes/types";

const STORAGE_KEY = "avaken-daily-balance-updates";
const MAX_HISTORY = 90;

export const DAILY_UPDATES_CHANGED = "avaken-daily-updates-changed";

export interface DailyBalanceUpdate {
  id: string;
  /** ISO calendar date (YYYY-MM-DD) in local timezone */
  date: string;
  personalBankTotal: number;
  avakenTideBalance: number;
  creditCardDebt: number;
  notes: string;
  updatedAt: string;
}

export interface DailyBalanceFormValues {
  personalBankTotal: string;
  avakenTideBalance: string;
  creditCardDebt: string;
  notes: string;
}

export interface DailyFinancialSnapshot {
  personalBankTotal: number;
  avakenTideBalance: number;
  creditCardDebt: number;
  netPosition: number;
  consolidatedLiquid: number;
  updatedAt: string;
  date: string;
}

let history: DailyBalanceUpdate[] = [];
let hydrated = false;

function hydrateFromStorage(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      history = parsed.filter(isDailyUpdate).slice(0, MAX_HISTORY);
    }
  } catch {
    history = [];
  }
}

function persistHistory(): void {
  if (typeof window === "undefined") return;
  if (history.length === 0) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

function notifyDailyUpdatesChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DAILY_UPDATES_CHANGED));
}

function isDailyUpdate(value: unknown): value is DailyBalanceUpdate {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.date === "string" &&
    typeof v.personalBankTotal === "number" &&
    typeof v.avakenTideBalance === "number" &&
    typeof v.creditCardDebt === "number" &&
    typeof v.notes === "string" &&
    typeof v.updatedAt === "string"
  );
}

function localDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function distributeTotal(
  total: number,
  accountIds: readonly string[],
): Record<string, number> {
  if (accountIds.length === 0) return {};

  const weights = accountIds.map((id) => {
    const seed = seedAccounts.find((a) => a.id === id)?.balance ?? 0;
    return Math.max(seed, 0);
  });
  const weightSum = weights.reduce((a, b) => a + b, 0);

  if (weightSum <= 0) {
    const each = total / accountIds.length;
    return Object.fromEntries(accountIds.map((id) => [id, each]));
  }

  return Object.fromEntries(
    accountIds.map((id, i) => [id, (weights[i]! / weightSum) * total]),
  );
}

function buildBalanceUpdates(
  personalBankTotal: number,
  avakenTideBalance: number,
  creditCardDebt: number,
): HermesAccountBalance[] {
  const updates: HermesAccountBalance[] = [];

  const bankSplit = distributeTotal(personalBankTotal, PERSONAL_BANK_ACCOUNT_IDS);
  for (const [accountId, balance] of Object.entries(bankSplit)) {
    updates.push({
      accountId,
      institution: accountId,
      balance,
      kind: "bank",
    });
  }

  const creditSplit = distributeTotal(creditCardDebt, PERSONAL_CREDIT_ACCOUNT_IDS);
  for (const [accountId, balance] of Object.entries(creditSplit)) {
    updates.push({
      accountId,
      institution: accountId,
      balance,
      kind: "credit",
    });
  }

  updates.push({
    accountId: "tide",
    institution: "Tide",
    balance: avakenTideBalance,
    kind: "bank",
  });

  return updates;
}

export function parseCurrencyInput(raw: string): number | null {
  const cleaned = raw.replace(/[£,\s]/g, "").trim();
  if (!cleaned) return 0;
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100) / 100;
}

export function formatCurrencyInput(value: number): string {
  if (!Number.isFinite(value)) return "";
  return value.toFixed(2);
}

export function getDailyUpdateHistory(limit = 14): DailyBalanceUpdate[] {
  hydrateFromStorage();
  return history.slice(0, limit);
}

export function getLatestDailyUpdate(): DailyBalanceUpdate | null {
  hydrateFromStorage();
  return history[0] ?? null;
}

export function getDailyFinancialSnapshot(): DailyFinancialSnapshot | null {
  const latest = getLatestDailyUpdate();
  if (!latest) return null;

  const netPosition = latest.personalBankTotal - latest.creditCardDebt;
  return {
    personalBankTotal: latest.personalBankTotal,
    avakenTideBalance: latest.avakenTideBalance,
    creditCardDebt: latest.creditCardDebt,
    netPosition,
    consolidatedLiquid: netPosition + latest.avakenTideBalance,
    updatedAt: latest.updatedAt,
    date: latest.date,
  };
}

/** Prefill the form from the latest update or current ledger totals. */
export function getDefaultDailyFormValues(): DailyBalanceFormValues {
  const latest = getLatestDailyUpdate();
  if (latest) {
    return {
      personalBankTotal: formatCurrencyInput(latest.personalBankTotal),
      avakenTideBalance: formatCurrencyInput(latest.avakenTideBalance),
      creditCardDebt: formatCurrencyInput(latest.creditCardDebt),
      notes: latest.notes,
    };
  }

  const ledger = getLedgerAccounts().filter((a) => a.entity === "personal");
  const bankBalances = PERSONAL_BANK_ACCOUNT_IDS.reduce((sum, id) => {
    const acct = ledger.find((a) => a.id === id);
    return sum + (acct?.balance ?? 0);
  }, 0);
  const creditCardDebt = PERSONAL_CREDIT_ACCOUNT_IDS.reduce((sum, id) => {
    const acct = ledger.find((a) => a.id === id);
    return sum + Math.abs(acct?.balance ?? 0);
  }, 0);
  const tide = getLedgerAccounts().find((a) => a.id === "tide")?.balance ?? 0;

  return {
    personalBankTotal: formatCurrencyInput(bankBalances),
    avakenTideBalance: formatCurrencyInput(tide),
    creditCardDebt: formatCurrencyInput(creditCardDebt),
    notes: "",
  };
}

export function wasUpdatedToday(): boolean {
  const latest = getLatestDailyUpdate();
  return latest?.date === localDateKey();
}

export function saveDailyBalanceUpdate(input: {
  personalBankTotal: number;
  avakenTideBalance: number;
  creditCardDebt: number;
  notes?: string;
}): DailyBalanceUpdate {
  hydrateFromStorage();

  const now = new Date();
  const entry: DailyBalanceUpdate = {
    id: `daily-${now.getTime()}`,
    date: localDateKey(now),
    personalBankTotal: input.personalBankTotal,
    avakenTideBalance: input.avakenTideBalance,
    creditCardDebt: input.creditCardDebt,
    notes: (input.notes ?? "").trim(),
    updatedAt: now.toISOString(),
  };

  history = [entry, ...history.filter((h) => h.id !== entry.id)].slice(0, MAX_HISTORY);
  persistHistory();

  applyMockAccountBalances(buildBalanceUpdates(
    input.personalBankTotal,
    input.avakenTideBalance,
    input.creditCardDebt,
  ));

  notifyDailyUpdatesChanged();
  return entry;
}

export function clearDailyUpdateHistory(): number {
  hydrateFromStorage();
  const removed = history.length;
  history = [];
  persistHistory();
  notifyDailyUpdatesChanged();
  return removed;
}
