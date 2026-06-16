/**
 * User-managed bank accounts and credit cards, stored in localStorage.
 * Seed accounts from mock.ts are always present; custom accounts are merged at read time.
 */

import { isClientReady } from "@/lib/client-ready";
import { isDbLedgerEnabled, getDbAccounts, refreshDbLedger } from "./db-cache";
import { accounts as seedAccounts } from "./mock";
import type { Account, AccountType } from "./types";

const STORAGE_KEY = "avaken-custom-accounts";

export const CUSTOM_ACCOUNTS_CHANGED = "avaken-custom-accounts-changed";

export type StoredEntity = "personal" | "avaken";

export interface CustomAccountRecord {
  id: string;
  name: string;
  institution: string;
  type: AccountType;
  entity: StoredEntity;
  balance: number;
  currency: "GBP" | "USD";
  last4: string;
  accent: string;
  createdAt: string;
}

export const INSTITUTION_PRESETS = [
  { name: "Starling", accent: "#7c5cff" },
  { name: "RBS", accent: "#3b82f6" },
  { name: "Barclays", accent: "#38bdf8" },
  { name: "Monzo", accent: "#ff5a5f" },
  { name: "Revolut", accent: "#6366f1" },
  { name: "Halifax", accent: "#0ea5e9" },
  { name: "Lloyds", accent: "#22c55e" },
  { name: "NatWest", accent: "#a855f7" },
  { name: "Chase", accent: "#14b8a6" },
  { name: "Tide", accent: "#10b981" },
  { name: "American Express", accent: "#f43f5e" },
  { name: "Capital One", accent: "#ef4444" },
  { name: "eToro", accent: "#22c55e" },
  { name: "Other", accent: "#8b909e" },
] as const;

const ACCENT_PALETTE = [
  "#7c5cff",
  "#3b82f6",
  "#38bdf8",
  "#10b981",
  "#f59e0b",
  "#f43f5e",
  "#22d3ee",
  "#a78bfa",
  "#14b8a6",
  "#fb7185",
];

const SEED_IDS = new Set(seedAccounts.map((a) => a.id));

let customAccounts: CustomAccountRecord[] = [];
let hydrated = false;

function hydrate(): void {
  if (hydrated || !isClientReady()) return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      customAccounts = parsed.filter(isCustomAccountRecord);
    }
  } catch {
    customAccounts = [];
  }
}

function persist(): void {
  if (typeof window === "undefined") return;
  if (customAccounts.length === 0) localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, JSON.stringify(customAccounts));
}

function notifyChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CUSTOM_ACCOUNTS_CHANGED));
}

function isCustomAccountRecord(value: unknown): value is CustomAccountRecord {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    typeof v.institution === "string" &&
    typeof v.type === "string" &&
    (v.entity === "personal" || v.entity === "avaken") &&
    typeof v.balance === "number" &&
    (v.currency === "GBP" || v.currency === "USD") &&
    typeof v.last4 === "string" &&
    typeof v.accent === "string" &&
    typeof v.createdAt === "string" &&
    !SEED_IDS.has(v.id)
  );
}

export function isSeedAccount(id: string): boolean {
  return SEED_IDS.has(id);
}

export function getCustomAccounts(): CustomAccountRecord[] {
  if (isDbLedgerEnabled()) {
    return getDbAccounts()
      .filter((a) => !SEED_IDS.has(a.id))
      .map((a) => ({
        id: a.id,
        name: a.name,
        institution: a.institution,
        type: a.type,
        entity: a.entity,
        balance: a.balance,
        currency: a.currency,
        last4: a.last4,
        accent: a.accent,
        createdAt: new Date().toISOString(),
      }));
  }
  hydrate();
  return [...customAccounts];
}

export function getCustomAccountsForEntity(entity: StoredEntity): CustomAccountRecord[] {
  return getCustomAccounts().filter((a) => a.entity === entity);
}

export function getAllAccountsBase(): Account[] {
  if (isDbLedgerEnabled()) {
    return getDbAccounts();
  }
  hydrate();
  return [...seedAccounts, ...customAccounts.map(toAccount)];
}

function toAccount(record: CustomAccountRecord): Account {
  return {
    id: record.id,
    name: record.name,
    institution: record.institution,
    type: record.type,
    entity: record.entity,
    balance: record.type === "credit" ? Math.abs(record.balance) : record.balance,
    currency: record.currency,
    last4: record.last4,
    accent: record.accent,
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
}

function accentForInstitution(institution: string, index: number): string {
  const preset = INSTITUTION_PRESETS.find(
    (p) => p.name.toLowerCase() === institution.toLowerCase(),
  );
  return preset?.accent ?? ACCENT_PALETTE[index % ACCENT_PALETTE.length]!;
}

export type AddAccountKind = "bank" | "credit";

export interface AddAccountInput {
  entity: StoredEntity;
  kind: AddAccountKind;
  name: string;
  institution: string;
  last4?: string;
  balance?: number;
  currency?: "GBP" | "USD";
  /** Business-only: savings reserve vs operating */
  subtype?: "current" | "savings" | "business";
}

function defaultType(input: AddAccountInput): AccountType {
  if (input.kind === "credit") return "credit";
  if (input.entity === "avaken") {
    return input.subtype === "savings" ? "savings" : "business";
  }
  return input.subtype === "savings" ? "savings" : "current";
}

export async function addCustomAccount(input: AddAccountInput): Promise<CustomAccountRecord> {
  hydrate();
  const institution = input.institution.trim() || "Other";
  const name = input.name.trim() || `${institution} ${input.kind === "credit" ? "Credit" : "Account"}`;
  const type = defaultType(input);
  const baseId = `${input.entity}-${slugify(institution)}-${input.kind}`;
  let id = baseId;
  let n = 2;
  while (SEED_IDS.has(id) || customAccounts.some((a) => a.id === id)) {
    id = `${baseId}-${n++}`;
  }

  const record: CustomAccountRecord = {
    id,
    name,
    institution,
    type,
    entity: input.entity,
    balance: input.kind === "credit" ? Math.abs(input.balance ?? 0) : (input.balance ?? 0),
    currency: input.currency ?? "GBP",
    last4: input.last4?.replace(/\D/g, "").slice(-4) || "—",
    accent: accentForInstitution(institution, customAccounts.length),
    createdAt: new Date().toISOString(),
  };

  if (isDbLedgerEnabled()) {
    await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: record.id,
        name: record.name,
        institution: record.institution,
        type: record.type,
        entity: record.entity,
        balance: record.balance,
        currency: record.currency,
        last4: record.last4,
        accent: record.accent,
      }),
    });
    await refreshDbLedger();
    notifyChanged();
    return record;
  }

  customAccounts = [...customAccounts, record];
  persist();
  notifyChanged();
  return record;
}

export async function updateCustomAccount(
  id: string,
  patch: Partial<Pick<CustomAccountRecord, "name" | "institution" | "last4" | "balance" | "currency">>,
): Promise<CustomAccountRecord | null> {
  hydrate();
  if (SEED_IDS.has(id)) return null;

  if (isDbLedgerEnabled()) {
    await fetch("/api/accounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: id, ...patch }),
    });
    await refreshDbLedger();
    notifyChanged();
    return getCustomAccounts().find((a) => a.id === id) ?? null;
  }

  const idx = customAccounts.findIndex((a) => a.id === id);
  if (idx === -1) return null;

  const current = customAccounts[idx]!;
  const updated: CustomAccountRecord = {
    ...current,
    ...(patch.name !== undefined ? { name: patch.name.trim() || current.name } : {}),
    ...(patch.institution !== undefined
      ? { institution: patch.institution.trim() || current.institution }
      : {}),
    ...(patch.last4 !== undefined
      ? { last4: patch.last4.replace(/\D/g, "").slice(-4) || "—" }
      : {}),
    ...(patch.balance !== undefined
      ? {
          balance:
            current.type === "credit" ? Math.abs(patch.balance) : patch.balance,
        }
      : {}),
    ...(patch.currency !== undefined ? { currency: patch.currency } : {}),
  };

  customAccounts = [...customAccounts.slice(0, idx), updated, ...customAccounts.slice(idx + 1)];
  persist();
  notifyChanged();
  return updated;
}

export async function removeCustomAccount(id: string): Promise<boolean> {
  hydrate();
  if (SEED_IDS.has(id)) return false;

  if (isDbLedgerEnabled()) {
    const res = await fetch(`/api/accounts?slug=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) return false;
    await refreshDbLedger();
    notifyChanged();
    return true;
  }

  const before = customAccounts.length;
  customAccounts = customAccounts.filter((a) => a.id !== id);
  if (customAccounts.length !== before) {
    persist();
    notifyChanged();
    return true;
  }
  return false;
}

/** Find a ledger account by institution text for import resolution. */
export function findAccountByInstitution(
  entity: StoredEntity,
  text: string,
  kind?: AddAccountKind,
): Account | null {
  const s = text.toLowerCase();
  const candidates = getAllAccountsBase().filter((a) => a.entity === entity);

  const filtered =
    kind === "credit"
      ? candidates.filter((a) => a.type === "credit")
      : kind === "bank"
        ? candidates.filter((a) => a.type !== "credit" && a.type !== "investment")
        : candidates;

  for (const account of filtered) {
    const inst = account.institution.toLowerCase();
    const name = account.name.toLowerCase();
    if (s.includes(inst) || inst.includes(s.trim()) || s.includes(name)) {
      return account;
    }
  }

  return filtered[0] ?? null;
}
