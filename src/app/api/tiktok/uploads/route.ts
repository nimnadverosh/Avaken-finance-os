import { NextResponse } from "next/server";
import { hasDatabase } from "@/db/index";
import { verifyAppAuth } from "@/lib/auth/session";
import {
  deleteTikTokUploadFromDb,
  readTikTokUploads,
  saveTikTokUploadToDb,
} from "@/lib/db/tiktok-persistence";
import type { TikTokUploadRecord } from "@/lib/tiktok/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isUploadRecord(value: unknown): value is TikTokUploadRecord {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.accountId === "string" &&
    typeof v.fileName === "string" &&
    typeof v.uploadedAt === "string" &&
    typeof v.report === "object" &&
    typeof v.summary === "object"
  );
}

export async function GET() {
  if (!hasDatabase()) {
    return NextResponse.json({ enabled: false, uploads: [] });
  }

  try {
    const uploads = await readTikTokUploads();
    return NextResponse.json({ enabled: true, uploads });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load uploads";
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
    const body = (await request.json()) as { record?: unknown };
    if (!isUploadRecord(body.record)) {
      return NextResponse.json({ error: "Invalid upload record" }, { status: 400 });
    }

    const saved = await saveTikTokUploadToDb(body.record);
    return NextResponse.json({ record: saved });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save upload";
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
  const id = searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await deleteTikTokUploadFromDb(id);
  return NextResponse.json({ ok: true });
}
