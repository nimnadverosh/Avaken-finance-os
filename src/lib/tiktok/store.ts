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
 */

import type { ParsedTikTokReport, SplitConfig, TikTokUploadRecord } from "./types";
import { buildMonthlySummary, DEFAULT_SPLIT, normaliseSplit } from "./model";

const UPLOADS_KEY = "avaken-tiktok-uploads";
const SPLIT_KEY = "avaken-tiktok-split";
const MAX_UPLOADS = 36; // three years of monthly reports

/** Fired whenever uploads or the split config change. */
export const TIKTOK_UPLOADS_CHANGED = "avaken-tiktok-uploads-changed";

let uploads: TikTokUploadRecord[] = [];
let split: SplitConfig = { ...DEFAULT_SPLIT };
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
      if (Array.isArray(parsed)) uploads = parsed.filter(isUploadRecord);
    }
  } catch {
    uploads = [];
  }
  try {
    const rawSplit = localStorage.getItem(SPLIT_KEY);
    if (rawSplit) split = normaliseSplit(JSON.parse(rawSplit) as Partial<SplitConfig>);
  } catch {
    split = { ...DEFAULT_SPLIT };
  }
}

function persistUploads(): void {
  if (typeof window === "undefined") return;
  if (uploads.length === 0) localStorage.removeItem(UPLOADS_KEY);
  else localStorage.setItem(UPLOADS_KEY, JSON.stringify(uploads.slice(0, MAX_UPLOADS)));
}

function persistSplit(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SPLIT_KEY, JSON.stringify(split));
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

/** Uploads sorted newest month first. */
function sortedByMonth(list: TikTokUploadRecord[]): TikTokUploadRecord[] {
  return [...list].sort((a, b) => b.summary.monthKey.localeCompare(a.summary.monthKey));
}

/* ------------------------------------------------------------------ */
/*  Split configuration                                                */
/* ------------------------------------------------------------------ */

export function getSplitConfig(): SplitConfig {
  hydrate();
  return { ...split };
}

/**
 * Update the company/personal split. Re-models every stored upload so the
 * dashboard reflects the new ratio immediately.
 */
export function setSplitConfig(input: Partial<SplitConfig> | number): SplitConfig {
  hydrate();
  split = normaliseSplit(input);
  uploads = uploads.map((u) => ({
    ...u,
    split,
    summary: buildMonthlySummary(u.report, split),
  }));
  persistSplit();
  persistUploads();
  notifyChanged();
  return { ...split };
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
 * Persist a freshly-parsed report. Models it with the current split and
 * replaces any existing upload for the same month.
 */
export function saveTikTokUpload(
  report: ParsedTikTokReport,
  fileName: string,
): TikTokUploadRecord {
  hydrate();
  const summary = buildMonthlySummary(report, split);
  const record: TikTokUploadRecord = {
    id: `tiktok-${summary.monthKey}-${Date.now()}`,
    fileName,
    uploadedAt: new Date().toISOString(),
    split,
    report,
    summary,
  };
  // Replace same-month uploads, keep the rest.
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
