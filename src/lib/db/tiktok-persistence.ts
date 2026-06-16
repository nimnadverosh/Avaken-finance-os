import { and, desc, eq } from "drizzle-orm";
import { db, hasDatabase } from "@/db/index";
import { affiliateProfiles, tiktokUploads } from "@/db/schema";
import type { TikTokAffiliateProfile } from "@/lib/tiktok/accounts";
import type { SplitConfig, TikTokUploadRecord } from "@/lib/tiktok/types";
import { buildMonthlySummaryWithSplit } from "@/lib/tiktok/model";

function mapAffiliate(row: typeof affiliateProfiles.$inferSelect): TikTokAffiliateProfile {
  return {
    id: row.slug,
    handle: row.handle,
    niche: row.niche,
    payTo: row.payTo,
    accent: row.accent,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapUpload(row: typeof tiktokUploads.$inferSelect): TikTokUploadRecord {
  const split = row.splitJson as SplitConfig;
  const report = row.reportJson as TikTokUploadRecord["report"];
  const summary = buildMonthlySummaryWithSplit(report, split);
  return {
    id: row.id,
    accountId: row.accountSlug,
    fileName: row.fileName,
    uploadedAt: row.uploadedAt.toISOString(),
    split,
    report,
    summary,
  };
}

export async function readAffiliateProfiles(): Promise<TikTokAffiliateProfile[]> {
  if (!hasDatabase()) return [];
  const rows = await db.select().from(affiliateProfiles).orderBy(affiliateProfiles.handle);
  return rows.map(mapAffiliate);
}

export async function readTikTokUploads(accountSlug?: string): Promise<TikTokUploadRecord[]> {
  if (!hasDatabase()) return [];
  const rows = accountSlug
    ? await db
        .select()
        .from(tiktokUploads)
        .where(eq(tiktokUploads.accountSlug, accountSlug))
        .orderBy(desc(tiktokUploads.monthKey))
    : await db.select().from(tiktokUploads).orderBy(desc(tiktokUploads.monthKey));
  return rows.map(mapUpload);
}

export async function upsertAffiliateProfile(
  profile: TikTokAffiliateProfile,
): Promise<TikTokAffiliateProfile> {
  if (!hasDatabase()) throw new Error("DATABASE_URL is not configured");

  const [existing] = await db
    .select()
    .from(affiliateProfiles)
    .where(eq(affiliateProfiles.slug, profile.id))
    .limit(1);

  if (existing) {
    const [row] = await db
      .update(affiliateProfiles)
      .set({
        handle: profile.handle,
        niche: profile.niche,
        payTo: profile.payTo,
        accent: profile.accent,
      })
      .where(eq(affiliateProfiles.slug, profile.id))
      .returning();
    return mapAffiliate(row!);
  }

  const [row] = await db
    .insert(affiliateProfiles)
    .values({
      slug: profile.id,
      handle: profile.handle,
      niche: profile.niche,
      payTo: profile.payTo,
      accent: profile.accent,
      createdAt: new Date(profile.createdAt),
    })
    .returning();
  return mapAffiliate(row!);
}

export async function deleteAffiliateProfile(slug: string): Promise<boolean> {
  if (!hasDatabase()) return false;
  await db.delete(affiliateProfiles).where(eq(affiliateProfiles.slug, slug));
  await db.delete(tiktokUploads).where(eq(tiktokUploads.accountSlug, slug));
  return true;
}

export async function saveTikTokUploadToDb(record: TikTokUploadRecord): Promise<TikTokUploadRecord> {
  if (!hasDatabase()) throw new Error("DATABASE_URL is not configured");

  await db
    .insert(tiktokUploads)
    .values({
      id: record.id,
      accountSlug: record.accountId,
      monthKey: record.summary.monthKey,
      fileName: record.fileName,
      uploadedAt: new Date(record.uploadedAt),
      splitJson: record.split,
      reportJson: record.report,
      summaryJson: record.summary,
    })
    .onConflictDoUpdate({
      target: [tiktokUploads.accountSlug, tiktokUploads.monthKey],
      set: {
        id: record.id,
        fileName: record.fileName,
        uploadedAt: new Date(record.uploadedAt),
        splitJson: record.split,
        reportJson: record.report,
        summaryJson: record.summary,
      },
    });

  return record;
}

export async function deleteTikTokUploadFromDb(id: string): Promise<boolean> {
  if (!hasDatabase()) return false;
  await db.delete(tiktokUploads).where(eq(tiktokUploads.id, id));
  return true;
}

export async function deleteTikTokUploadsForAccountFromDb(accountSlug: string): Promise<number> {
  if (!hasDatabase()) return 0;
  const rows = await db
    .select({ id: tiktokUploads.id })
    .from(tiktokUploads)
    .where(eq(tiktokUploads.accountSlug, accountSlug));
  await db.delete(tiktokUploads).where(eq(tiktokUploads.accountSlug, accountSlug));
  return rows.length;
}

export async function affiliateProfileExists(slug: string): Promise<boolean> {
  if (!hasDatabase()) return false;
  const [row] = await db
    .select({ slug: affiliateProfiles.slug })
    .from(affiliateProfiles)
    .where(eq(affiliateProfiles.slug, slug))
    .limit(1);
  return Boolean(row);
}

export async function findAffiliateByHandle(handle: string): Promise<TikTokAffiliateProfile | null> {
  if (!hasDatabase()) return null;
  const [row] = await db
    .select()
    .from(affiliateProfiles)
    .where(eq(affiliateProfiles.handle, handle))
    .limit(1);
  return row ? mapAffiliate(row) : null;
}
