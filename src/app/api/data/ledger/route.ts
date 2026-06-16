import { NextResponse } from "next/server";
import { hasDatabase } from "@/db/index";
import { readLedgerSnapshot } from "@/lib/db/read";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Returns persisted ledger data when DATABASE_URL is configured. */
export async function GET() {
  if (!hasDatabase()) {
    return NextResponse.json({ enabled: false });
  }

  try {
    const snapshot = await readLedgerSnapshot();
    if (!snapshot) {
      return NextResponse.json({ enabled: false });
    }

    return NextResponse.json({
      enabled: true,
      ...snapshot,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load ledger";
    return NextResponse.json({ enabled: true, error: message }, { status: 500 });
  }
}
