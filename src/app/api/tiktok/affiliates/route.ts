import { NextResponse } from "next/server";
import { hasDatabase } from "@/db/index";
import { verifyAppAuth } from "@/lib/auth/session";
import {
  deleteAffiliateProfile,
  readAffiliateProfiles,
  upsertAffiliateProfile,
} from "@/lib/db/tiktok-persistence";
import type { TikTokAffiliateProfile } from "@/lib/tiktok/accounts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isProfile(value: unknown): value is TikTokAffiliateProfile {
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

export async function GET() {
  if (!hasDatabase()) {
    return NextResponse.json({ enabled: false, profiles: [] });
  }

  try {
    const profiles = await readAffiliateProfiles();
    return NextResponse.json({ enabled: true, profiles });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load profiles";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = verifyAppAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!hasDatabase()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const body = (await request.json()) as { profile?: unknown };
    if (!isProfile(body.profile)) {
      return NextResponse.json({ error: "Invalid profile" }, { status: 400 });
    }

    const saved = await upsertAffiliateProfile(body.profile);
    return NextResponse.json({ profile: saved });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = verifyAppAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!hasDatabase()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug")?.trim();
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  await deleteAffiliateProfile(slug);
  return NextResponse.json({ ok: true });
}
