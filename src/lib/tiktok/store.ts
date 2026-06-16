/**
 * Client-side persistence for monthly TikTok uploads.
 *
 * Uploads are keyed by account + month — each affiliate account can have one
 * report per calendar month. Re-uploading the same month for the same account
 * replaces the previous file.
 */

import { isClientReady } from "@/lib/client-ready";
import {
  DB_LEDGER_CHANGED,
  getDbTikTokUploads,
  isDbLedgerEnabled,
  refreshDbLedger,
} from "@/lib/data/db-cache";
import type { TikTokAccount } from "@/lib/data/types";
import {
  ensureAccountFromCreatorSync,
  getAffiliateAccountById,
} from "./accounts";
import type { ParsedTikTokReport, SplitConfig, TikTokUploadRecord } from "./types";
import { buildMonthlySummaryWithSplit, splitForMonth } from "./model";

const UPLOADS_KEY = "avaken-tiktok-uploads";
const MAX_UPLOADS = 36 * 8;

export const TIKTOK_UPLOADS_CHANGED = "avaken-tiktok-uploads-changed";

let uploads: TikTokUploadRecord[] = [];
let hydrated = false;

if (typeof window !== "undefined") {
  window.addEventListener(DB_LEDGER_CHANGED, () => {
    if (isDbLedgerEnabled()) {
      uploads = getDbTikTokUploads();
      notifyChanged();
    }
  });
}

function hydrate(): void {
  if (hydrated || !isClientReady()) return;
  hydrated = true;

  if (isDbLedgerEnabled()) {
    uploads = getDbTikTokUploads();
    return;
  }

  try {
    const rawUploads = localStorage.getItem(UPLOADS_KEY);
    if (rawUploads) {
      const parsed = JSON.parse(rawUploads) as unknown;
      if (Array.isArray(parsed)) {
        uploads = parsed.filter(isUploadRecord).map(remodelUpload);
        migrateOrphanUploads();
      }
    }
  } catch {
    uploads = [];
  }
  localStorage.removeItem("avaken-tiktok-split");
}

function persistUploads(): void {
  if (typeof window === "undefined" || isDbLedgerEnabled()) return;
  if (uploads.length === 0) localStorage.removeItem(UPLOADS_KEY);
  else localStorage.setItem(UPLOADS_KEY, JSON.stringify(uploads.slice(0, MAX_UPLOADS)));
}

function notifyChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TIKTOK_UPLOADS_CHANGED));
}

function isUploadRecord(value: unknown): value is TikTokUploadRecord {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.fileName === "string" &&
    typeof v.uploadedAt === "string" &&
    typeof v.report === "object" &&
    typeof v.summary === "object"
  );
}

function remodelUpload(record: TikTokUploadRecord): TikTokUploadRecord {
  const summary = buildMonthlySummaryWithSplit(record.report, record.split);
  return { ...record, summary };
}

function migrateOrphanUploads(): void {
  const orphans = uploads.filter((u) => !u.accountId);
  if (orphans.length === 0) return;

  for (const orphan of orphans) {
    const payTo: TikTokAccount["payTo"] =
      orphan.summary.split.company >= 1 ? "company" : "personal";
    const account = ensureAccountFromCreatorSync(orphan.report.creatorName, payTo);
    orphan.accountId = account.id;
  }
  persistUploads();
}

function uploadKey(accountId: string, monthKey: string): string {
  return `${accountId}::${monthKey}`;
}

function sortedByMonth(list: TikTokUploadRecord[]): TikTokUploadRecord[] {
  return [...list].sort((a, b) => b.summary.monthKey.localeCompare(a.summary.monthKey));
}

export function getTikTokUploads(accountId?: string): TikTokUploadRecord[] {
  hydrate();
  const list = accountId ? uploads.filter((u) => u.accountId === accountId) : uploads;
  return sortedByMonth(list);
}

export function getLatestTikTokUpload(accountId?: string): TikTokUploadRecord | null {
  hydrate();
  const list = accountId ? uploads.filter((u) => u.accountId === accountId) : uploads;
  return sortedByMonth(list)[0] ?? null;
}

export function hasTikTokUploads(): boolean {
  hydrate();
  return uploads.length > 0;
}

function summarySplitFromReport(report: ParsedTikTokReport): SplitConfig {
  return splitForMonth(report.year, report.month);
}

export async function saveTikTokUpload(
  report: ParsedTikTokReport,
  fileName: string,
  accountId: string,
  splitOverride?: SplitConfig,
): Promise<TikTokUploadRecord> {
  hydrate();
  if (!getAffiliateAccountById(accountId)) {
    throw new Error("Select a valid affiliate account before importing.");
  }

  const summary = buildMonthlySummaryWithSplit(
    report,
    splitOverride ?? summarySplitFromReport(report),
  );
  const key = uploadKey(accountId, summary.monthKey);
  const record: TikTokUploadRecord = {
    id: `tiktok-${key}-${Date.now()}`,
    accountId,
    fileName,
    uploadedAt: new Date().toISOString(),
    split: summary.split,
    report,
    summary,
  };

  if (isDbLedgerEnabled()) {
    await fetch("/api/tiktok/uploads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ record }),
    });
    await refreshDbLedger();
    uploads = sortedByMonth([
      record,
      ...uploads.filter((u) => uploadKey(u.accountId, u.summary.monthKey) !== key),
    ]).slice(0, MAX_UPLOADS);
    notifyChanged();
    return record;
  }

  uploads = [
    record,
    ...uploads.filter((u) => uploadKey(u.accountId, u.summary.monthKey) !== key),
  ].slice(0, MAX_UPLOADS);

  persistUploads();
  notifyChanged();
  return record;
}

export async function deleteTikTokUpload(id: string): Promise<void> {
  hydrate();
  const before = uploads.length;
  uploads = uploads.filter((u) => u.id !== id);
  if (uploads.length === before) return;

  if (isDbLedgerEnabled()) {
    await fetch(`/api/tiktok/uploads?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await refreshDbLedger();
  } else {
    persistUploads();
  }
  notifyChanged();
}

export async function deleteTikTokUploadsForAccount(accountId: string): Promise<number> {
  hydrate();
  const before = uploads.length;
  uploads = uploads.filter((u) => u.accountId !== accountId);
  const removed = before - uploads.length;
  if (removed === 0) return 0;

  if (isDbLedgerEnabled()) {
    for (const u of getDbTikTokUploads().filter((x) => x.accountId === accountId)) {
      await fetch(`/api/tiktok/uploads?id=${encodeURIComponent(u.id)}`, { method: "DELETE" });
    }
    await refreshDbLedger();
  } else {
    persistUploads();
  }
  notifyChanged();
  return removed;
}

export async function clearTikTokUploads(): Promise<number> {
  hydrate();
  const removed = uploads.length;
  if (removed === 0) return 0;

  if (isDbLedgerEnabled()) {
    for (const u of [...uploads]) {
      await fetch(`/api/tiktok/uploads?id=${encodeURIComponent(u.id)}`, { method: "DELETE" });
    }
    await refreshDbLedger();
  }

  uploads = [];
  persistUploads();
  notifyChanged();
  return removed;
}

export function uploadAccountLabel(record: TikTokUploadRecord): string {
  const account = getAffiliateAccountById(record.accountId);
  return account?.handle ?? record.report.creatorName ?? "Unknown account";
}

/** Re-hydrate from DB after async ledger sync (call from components on mount). */
export function refreshTikTokUploadsFromDb(): void {
  if (!isDbLedgerEnabled()) return;
  uploads = getDbTikTokUploads();
  hydrated = true;
  notifyChanged();
}
