/**
 * Client-side persistence for monthly TikTok uploads.
 *
 * Uploads are keyed by account + month — each affiliate account can have one
 * report per calendar month. Re-uploading the same month for the same account
 * replaces the previous file.
 */

import { isClientReady } from "@/lib/client-ready";
import type { TikTokAccount } from "@/lib/data/types";
import {
  ensureAccountFromCreator,
  getAffiliateAccountById,
} from "./accounts";
import type { ParsedTikTokReport, SplitConfig, TikTokUploadRecord } from "./types";
import { buildMonthlySummaryWithSplit, splitForMonth } from "./model";

const UPLOADS_KEY = "avaken-tiktok-uploads";
const MAX_UPLOADS = 36 * 8; // up to 8 accounts × 3 years

/** Fired whenever uploads change. */
export const TIKTOK_UPLOADS_CHANGED = "avaken-tiktok-uploads-changed";

let uploads: TikTokUploadRecord[] = [];
let hydrated = false;

/* ------------------------------------------------------------------ */
/*  Hydration & persistence                                            */
/* ------------------------------------------------------------------ */

function hydrate(): void {
  if (hydrated || !isClientReady()) return;
  hydrated = true;
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
  if (typeof window === "undefined") return;
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

/** Re-apply smart-adjustment using the stored split configuration. */
function remodelUpload(record: TikTokUploadRecord): TikTokUploadRecord {
  const summary = buildMonthlySummaryWithSplit(record.report, record.split);
  return { ...record, summary };
}

/** Assign legacy uploads (no accountId) to an account derived from creator name. */
function migrateOrphanUploads(): void {
  const orphans = uploads.filter((u) => !u.accountId);
  if (orphans.length === 0) return;

  for (const orphan of orphans) {
    const payTo: TikTokAccount["payTo"] =
      orphan.summary.split.company >= 1 ? "company" : "personal";
    const account = ensureAccountFromCreator(orphan.report.creatorName, payTo);
    orphan.accountId = account.id;
  }
  persistUploads();
}

function uploadKey(accountId: string, monthKey: string): string {
  return `${accountId}::${monthKey}`;
}

/** Uploads sorted newest month first. */
function sortedByMonth(list: TikTokUploadRecord[]): TikTokUploadRecord[] {
  return [...list].sort((a, b) => b.summary.monthKey.localeCompare(a.summary.monthKey));
}

/* ------------------------------------------------------------------ */
/*  Uploads CRUD                                                       */
/* ------------------------------------------------------------------ */

export function getTikTokUploads(accountId?: string): TikTokUploadRecord[] {
  hydrate();
  const list = accountId ? uploads.filter((u) => u.accountId === accountId) : uploads;
  return sortedByMonth(list);
}

/** Most recent month on record, or null if nothing uploaded yet. */
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

/**
 * Persist a freshly-parsed report for a specific affiliate account.
 * Replaces any existing upload for the same account + month.
 */
export function saveTikTokUpload(
  report: ParsedTikTokReport,
  fileName: string,
  accountId: string,
  splitOverride?: SplitConfig,
): TikTokUploadRecord {
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

  uploads = [
    record,
    ...uploads.filter((u) => uploadKey(u.accountId, u.summary.monthKey) !== key),
  ].slice(0, MAX_UPLOADS);

  persistUploads();
  notifyChanged();
  return record;
}

export function deleteTikTokUpload(id: string): void {
  hydrate();
  const before = uploads.length;
  uploads = uploads.filter((u) => u.id !== id);
  if (uploads.length !== before) {
    persistUploads();
    notifyChanged();
  }
}

/** Delete all uploads belonging to an affiliate account. */
export function deleteTikTokUploadsForAccount(accountId: string): number {
  hydrate();
  const before = uploads.length;
  uploads = uploads.filter((u) => u.accountId !== accountId);
  const removed = before - uploads.length;
  if (removed > 0) {
    persistUploads();
    notifyChanged();
  }
  return removed;
}

export function clearTikTokUploads(): number {
  hydrate();
  const removed = uploads.length;
  uploads = [];
  persistUploads();
  notifyChanged();
  return removed;
}

/** Resolve account display label for an upload row. */
export function uploadAccountLabel(record: TikTokUploadRecord): string {
  const account = getAffiliateAccountById(record.accountId);
  return account?.handle ?? record.report.creatorName ?? "Unknown account";
}
