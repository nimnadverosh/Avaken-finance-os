import { NextResponse } from "next/server";
import { hasDatabase } from "@/db/index";
import { verifyAppAuth } from "@/lib/auth/session";
import { updateAccountBalancesInDb } from "@/lib/db/write-balances";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const auth = verifyAppAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!hasDatabase()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const body = (await request.json()) as { updates?: Record<string, number> };
    const updates = body.updates;

    if (!updates || typeof updates !== "object") {
      return NextResponse.json({ error: "updates object required" }, { status: 400 });
    }

    const sanitized: Record<string, number> = {};
    for (const [slug, balance] of Object.entries(updates)) {
      if (typeof balance === "number" && !Number.isNaN(balance)) {
        sanitized[slug] = balance;
      }
    }

    const updated = await updateAccountBalancesInDb(sanitized);
    return NextResponse.json({ ok: true, updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update balances";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
