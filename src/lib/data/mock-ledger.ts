import { transactions as seedTransactions } from "./mock";
import { isRealDataMode } from "./real-data-mode";
import type { Transaction } from "./types";

const STORAGE_KEY = "avaken-mock-imports";

export const MOCK_LEDGER_CHANGED = "avaken-mock-ledger-changed";

let importOverlay: Transaction[] = [];
let hydrated = false;

function hydrateFromStorage(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      importOverlay = parsed as Transaction[];
    }
  } catch {
    importOverlay = [];
  }
}

function persistOverlay(): void {
  if (typeof window === "undefined") return;
  if (importOverlay.length === 0) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(importOverlay));
}

function notifyLedgerChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(MOCK_LEDGER_CHANGED));
}

/** Seed data plus client-side imports (persisted in localStorage). */
export function getLedgerTransactions(): Transaction[] {
  hydrateFromStorage();
  if (isRealDataMode()) return [...importOverlay];
  return [...importOverlay, ...seedTransactions];
}

export function mockImportCount(): number {
  hydrateFromStorage();
  return importOverlay.length;
}

export function prependMockImports(created: Transaction[]): void {
  hydrateFromStorage();
  importOverlay = [...created, ...importOverlay];
  persistOverlay();
  notifyLedgerChanged();
}

/** Removes imported rows only; seed transactions in mock.ts are untouched. */
export function clearMockImports(): number {
  hydrateFromStorage();
  const removed = importOverlay.length;
  importOverlay = [];
  persistOverlay();
  notifyLedgerChanged();
  return removed;
}
