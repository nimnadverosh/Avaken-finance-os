/**
 * Client-side persistence for monthly TikTok uploads.
 *
 * Mirrors the architecture of `src/lib/data/daily-updates.ts`:
 *   • module-level cache, hydrated lazily from localStorage
 *   • a window CustomEvent so the dashboard re-renders in real time
 *     (wired into `useMockDataVersion`)
 *   • pure getters the query layer reads from
 *
 * Stored data is keyed by month — re-uploading the same month replaces it.
 * Attribution (company vs personal) is derived automatically from each report's
 * month on load and save — no manual split configuration.
 */

import type { ParsedTikTokReport, TikTokUploadRecord } from "./types";
import { buildMonthlySummary } from "./model";

const UPLOADS_KEY = "avaken-tiktok-uploads";
const MAX_UPLOADS = 36; // three years of monthly reports

/** Fired whenever uploads change. */
export const TIKTOK_UPLOADS_CHANGED = "avaken-tiktok-uploads-changed";

let uploads: TikTokUploadRecord[] = [];
let hydrated = false;

/* ------------------------------------------------------------------ */
/*  Hydration & persistence                                            */
/* ------------------------------------------------------------------ */

function hydrate(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const rawUploads = localStorage.getItem(UPLOADS_KEY);
    if (rawUploads) {
      const parsed = JSON.parse(rawUploads) as unknown;
      if (Array.isArray(parsed)) {
        // Re-model on load so attribution rules stay current (e.g. Jul 2026 cutoff).
        uploads = parsed.filter(isUploadRecord).map(remodelUpload);
      }
    }
  } catch {
    uploads = [];
  }
  // Drop legacy split config key — attribution is now automatic.
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

/** Re-apply automatic attribution + smart-adjustment to a stored upload. */
function remodelUpload(record: TikTokUploadRecord): TikTokUploadRecord {
  const summary = buildMonthlySummary(record.report);
  return { ...record, split: summary.split, summary };
}

/** Uploads sorted newest month first. */
function sortedByMonth(list: TikTokUploadRecord[]): TikTokUploadRecord[] {
  return [...list].sort((a, b) => b.summary.monthKey.localeCompare(a.summary.monthKey));
}

/* ------------------------------------------------------------------ */
/*  Uploads CRUD                                                       */
/* ------------------------------------------------------------------ */

export function getTikTokUploads(): TikTokUploadRecord[] {
  hydrate();
  return sortedByMonth(uploads);
}

/** Most recent month on record, or null if nothing uploaded yet. */
export function getLatestTikTokUpload(): TikTokUploadRecord | null {
  hydrate();
  return sortedByMonth(uploads)[0] ?? null;
}

export function hasTikTokUploads(): boolean {
  hydrate();
  return uploads.length > 0;
}

/**
 * Persist a freshly-parsed report. Attribution is derived from the report month.
 * Replaces any existing upload for the same month.
 */
export function saveTikTokUpload(
  report: ParsedTikTokReport,
  fileName: string,
): TikTokUploadRecord {
  hydrate();
  const summary = buildMonthlySummary(report);
  const record: TikTokUploadRecord = {
    id: `tiktok-${summary.monthKey}-${Date.now()}`,
    fileName,
    uploadedAt: new Date().toISOString(),
    split: summary.split,
    report,
    summary,
  };
  uploads = [record, ...uploads.filter((u) => u.summary.monthKey !== summary.monthKey)].slice(
    0,
    MAX_UPLOADS,
  );
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

export function clearTikTokUploads(): number {
  hydrate();
  const removed = uploads.length;
  uploads = [];
  persistUploads();
  notifyChanged();
  return removed;
}
