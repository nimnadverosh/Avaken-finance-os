import { NextResponse } from "next/server";
import { hasDatabase } from "@/db/index";
import { verifyAppAuth } from "@/lib/auth/session";
import {
  accountSlugExists,
  deleteAccountBySlug,
  insertAccount,
  updateAccountBySlug,
} from "@/lib/db/write-accounts";
import { accounts as seedAccounts } from "@/lib/data/mock";
import type { AccountType } from "@/lib/data/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SEED_IDS = new Set(seedAccounts.map((a) => a.id));

function isValidType(value: unknown): value is AccountType {
  return (
    value === "business" ||
    value === "current" ||
    value === "savings" ||
    value === "investment" ||
    value === "credit"
  );
}

export async function POST(request: Request) {
  const auth = verifyAppAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!hasDatabase()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const institution = typeof body.institution === "string" ? body.institution.trim() : "";
    const entity = body.entity === "personal" || body.entity === "avaken" ? body.entity : null;
    const type = isValidType(body.type) ? body.type : null;
    const balance = typeof body.balance === "number" ? body.balance : 0;
    const currency = body.currency === "USD" ? "USD" : "GBP";
    const last4 = typeof body.last4 === "string" ? body.last4 : "—";
    const accent = typeof body.accent === "string" ? body.accent : "#8b909e";

    if (!slug || !name || !institution || !entity || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (SEED_IDS.has(slug)) {
      return NextResponse.json({ error: "Cannot create account with seed id" }, { status: 409 });
    }

    if (await accountSlugExists(slug)) {
      return NextResponse.json({ error: "Account already exists" }, { status: 409 });
    }

    const account = await insertAccount({
      slug,
      name,
      institution,
      type,
      entity,
      balance: type === "credit" ? Math.abs(balance) : balance,
      currency,
      last4,
      accent,
    });

    return NextResponse.json({ account });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create account";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = verifyAppAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!hasDatabase()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

    const patch: Parameters<typeof updateAccountBySlug>[1] = {};
    if (typeof body.name === "string") patch.name = body.name.trim();
    if (typeof body.institution === "string") patch.institution = body.institution.trim();
    if (typeof body.balance === "number") patch.balance = body.balance;
    if (body.currency === "GBP" || body.currency === "USD") patch.currency = body.currency;
    if (typeof body.last4 === "string") patch.last4 = body.last4;

    const account = await updateAccountBySlug(slug, patch);
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    return NextResponse.json({ account });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update account";
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

  if (SEED_IDS.has(slug)) {
    return NextResponse.json({ error: "Cannot delete seed account" }, { status: 403 });
  }

  const deleted = await deleteAccountBySlug(slug);
  if (!deleted) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
