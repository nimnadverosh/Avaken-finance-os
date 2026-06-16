import { NextResponse } from "next/server";
import { hasDatabase } from "@/db/index";
import { verifyAppAuth } from "@/lib/auth/session";
import { plannerTaskCount, replacePlannerTasks } from "@/lib/db/planner-persistence";
import {
  readAffiliateProfiles,
  readTikTokUploads,
  saveTikTokUploadToDb,
  upsertAffiliateProfile,
} from "@/lib/db/tiktok-persistence";
import { insertAccount } from "@/lib/db/write-accounts";
import { updateAccountBalancesInDb } from "@/lib/db/write-balances";
import { accounts as seedAccounts } from "@/lib/data/mock";
import type { PlannerTask } from "@/lib/planner/types";
import type { TikTokUploadRecord } from "@/lib/tiktok/types";
import type { TikTokAffiliateProfile } from "@/lib/tiktok/accounts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SEED_IDS = new Set(seedAccounts.map((a) => a.id));

interface MigratePayload {
  customAccounts?: Array<{
    id: string;
    name: string;
    institution: string;
    type: string;
    entity: string;
    balance: number;
    currency: string;
    last4: string;
    accent: string;
  }>;
  balanceOverlay?: Record<string, number>;
  tiktokAffiliates?: TikTokAffiliateProfile[];
  tiktokUploads?: TikTokUploadRecord[];
  plannerTasks?: PlannerTask[];
}

/** One-time import of localStorage data into Postgres. */
export async function POST(request: Request) {
  const auth = verifyAppAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!hasDatabase()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const body = (await request.json()) as MigratePayload;
    const stats = {
      accounts: 0,
      balances: 0,
      affiliates: 0,
      uploads: 0,
      plannerTasks: 0,
    };

    if (body.customAccounts?.length) {
      for (const acct of body.customAccounts) {
        if (SEED_IDS.has(acct.id)) continue;
        try {
          await insertAccount({
            slug: acct.id,
            name: acct.name,
            institution: acct.institution,
            type: acct.type as "business" | "current" | "savings" | "investment" | "credit",
            entity: acct.entity as "personal" | "avaken",
            balance: acct.balance,
            currency: acct.currency === "USD" ? "USD" : "GBP",
            last4: acct.last4,
            accent: acct.accent,
          });
          stats.accounts++;
        } catch {
          /* slug may already exist */
        }
      }
    }

    if (body.balanceOverlay && Object.keys(body.balanceOverlay).length > 0) {
      stats.balances = await updateAccountBalancesInDb(body.balanceOverlay);
    }

    if (body.tiktokAffiliates?.length) {
      const existing = await readAffiliateProfiles();
      const existingSlugs = new Set(existing.map((p) => p.id));
      for (const profile of body.tiktokAffiliates) {
        if (existingSlugs.has(profile.id)) continue;
        await upsertAffiliateProfile(profile);
        stats.affiliates++;
      }
    }

    if (body.tiktokUploads?.length) {
      const existing = await readTikTokUploads();
      const existingKeys = new Set(existing.map((u) => `${u.accountId}::${u.summary.monthKey}`));
      for (const upload of body.tiktokUploads) {
        const key = `${upload.accountId}::${upload.summary.monthKey}`;
        if (existingKeys.has(key)) continue;
        await saveTikTokUploadToDb(upload);
        stats.uploads++;
      }
    }

    if (body.plannerTasks?.length) {
      const count = await plannerTaskCount();
      if (count === 0) {
        await replacePlannerTasks(body.plannerTasks);
        stats.plannerTasks = body.plannerTasks.length;
      }
    }

    return NextResponse.json({ ok: true, stats });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Migration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
