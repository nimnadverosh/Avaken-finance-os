/**
 * Registry of TikTok Shop affiliate creator accounts.
 *
 * Each account owns its own monthly Excel uploads. The dashboard aggregates
 * across all registered accounts; the affiliates page shows per-account KPIs.
 */

import { isClientReady } from "@/lib/client-ready";
import {
  DB_LEDGER_CHANGED,
  getDbAffiliateProfiles,
  isDbLedgerEnabled,
  refreshDbLedger,
} from "@/lib/data/db-cache";
import type { TikTokAccount } from "@/lib/data/types";

export interface TikTokAffiliateProfile {
  id: string;
  handle: string;
  niche: string;
  payTo: TikTokAccount["payTo"];
  accent: string;
  createdAt: string;
}

const ACCOUNTS_KEY = "avaken-tiktok-accounts";

export const TIKTOK_ACCOUNTS_CHANGED = "avaken-tiktok-accounts-changed";

const ACCENT_PALETTE = [
  "#10b981",
  "#34d399",
  "#38bdf8",
  "#a78bfa",
  "#f59e0b",
  "#f43f5e",
  "#22d3ee",
  "#fb7185",
];

let accounts: TikTokAffiliateProfile[] = [];
let hydrated = false;

if (typeof window !== "undefined") {
  window.addEventListener(DB_LEDGER_CHANGED, () => {
    if (isDbLedgerEnabled()) {
      accounts = getDbAffiliateProfiles();
      notifyChanged();
    }
  });
}

function hydrate(): void {
  if (hydrated || !isClientReady()) return;
  hydrated = true;

  if (isDbLedgerEnabled()) {
    accounts = getDbAffiliateProfiles();
    return;
  }

  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        accounts = parsed.filter(isAffiliateProfile);
      }
    }
  } catch {
    accounts = [];
  }
}

function persist(): void {
  if (typeof window === "undefined" || isDbLedgerEnabled()) return;
  if (accounts.length === 0) localStorage.removeItem(ACCOUNTS_KEY);
  else localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function notifyChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TIKTOK_ACCOUNTS_CHANGED));
}

function isAffiliateProfile(value: unknown): value is TikTokAffiliateProfile {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.handle === "string" &&
    typeof v.niche === "string" &&
    (v.payTo === "company" || v.payTo === "personal") &&
    typeof v.accent === "string" &&
    typeof v.createdAt === "string"
  );
}

export function normalizeHandle(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "@account";
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

export function findAccountByCreatorName(creatorName: string): TikTokAffiliateProfile | null {
  hydrate();
  if (!creatorName.trim()) return null;
  const target = normalizeHandle(creatorName).toLowerCase();
  return accounts.find((a) => a.handle.toLowerCase() === target) ?? null;
}

export function getAffiliateAccounts(): TikTokAffiliateProfile[] {
  hydrate();
  return [...accounts].sort((a, b) => a.handle.localeCompare(b.handle));
}

export function getAffiliateAccountById(id: string): TikTokAffiliateProfile | null {
  hydrate();
  return accounts.find((a) => a.id === id) ?? null;
}

export function hasAffiliateAccounts(): boolean {
  hydrate();
  return accounts.length > 0;
}

export interface AddAffiliateInput {
  handle: string;
  niche?: string;
  payTo?: TikTokAccount["payTo"];
}

export async function addAffiliateAccount(input: AddAffiliateInput): Promise<TikTokAffiliateProfile> {
  hydrate();
  const handle = normalizeHandle(input.handle);
  const existing = accounts.find((a) => a.handle.toLowerCase() === handle.toLowerCase());
  if (existing) return existing;

  const profile: TikTokAffiliateProfile = {
    id: `tt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    handle,
    niche: input.niche?.trim() || "TikTok Shop",
    payTo: input.payTo ?? "personal",
    accent: ACCENT_PALETTE[accounts.length % ACCENT_PALETTE.length]!,
    createdAt: new Date().toISOString(),
  };

  if (isDbLedgerEnabled()) {
    await fetch("/api/tiktok/affiliates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile }),
    });
    await refreshDbLedger();
    accounts = getDbAffiliateProfiles();
    notifyChanged();
    return profile;
  }

  accounts = [...accounts, profile];
  persist();
  notifyChanged();
  return profile;
}

export async function updateAffiliateAccount(
  id: string,
  patch: Partial<Pick<TikTokAffiliateProfile, "handle" | "niche" | "payTo">>,
): Promise<TikTokAffiliateProfile | null> {
  hydrate();
  const idx = accounts.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  const current = accounts[idx]!;
  const updated: TikTokAffiliateProfile = {
    ...current,
    ...(patch.handle !== undefined ? { handle: normalizeHandle(patch.handle) } : {}),
    ...(patch.niche !== undefined ? { niche: patch.niche.trim() || current.niche } : {}),
    ...(patch.payTo !== undefined ? { payTo: patch.payTo } : {}),
  };

  if (isDbLedgerEnabled()) {
    await fetch("/api/tiktok/affiliates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile: updated }),
    });
    await refreshDbLedger();
    accounts = getDbAffiliateProfiles();
    notifyChanged();
    return updated;
  }

  accounts = [...accounts.slice(0, idx), updated, ...accounts.slice(idx + 1)];
  persist();
  notifyChanged();
  return updated;
}

export async function removeAffiliateAccount(id: string): Promise<boolean> {
  hydrate();
  const before = accounts.length;
  accounts = accounts.filter((a) => a.id !== id);
  if (accounts.length === before) return false;

  if (isDbLedgerEnabled()) {
    await fetch(`/api/tiktok/affiliates?slug=${encodeURIComponent(id)}`, { method: "DELETE" });
    await refreshDbLedger();
  } else {
    persist();
  }
  notifyChanged();
  return true;
}

export async function ensureAccountFromCreator(
  creatorName: string,
  payTo: TikTokAccount["payTo"] = "personal",
): Promise<TikTokAffiliateProfile> {
  const existing = findAccountByCreatorName(creatorName);
  if (existing) return existing;
  return addAffiliateAccount({
    handle: creatorName.trim() || "@primary",
    niche: "TikTok Shop",
    payTo,
  });
}

/** Sync variant for localStorage-only migration (not used when DB is enabled). */
export function ensureAccountFromCreatorSync(
  creatorName: string,
  payTo: TikTokAccount["payTo"] = "personal",
): TikTokAffiliateProfile {
  const existing = findAccountByCreatorName(creatorName);
  if (existing) return existing;

  const handle = normalizeHandle(creatorName.trim() || "@primary");
  const profile: TikTokAffiliateProfile = {
    id: `tt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    handle,
    niche: "TikTok Shop",
    payTo,
    accent: ACCENT_PALETTE[accounts.length % ACCENT_PALETTE.length]!,
    createdAt: new Date().toISOString(),
  };
  accounts = [...accounts, profile];
  persist();
  notifyChanged();
  return profile;
}
