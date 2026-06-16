import { NextResponse } from "next/server";
import { persistImportedTransactions } from "@/lib/data/persist-import";
import type {
  HermesAccountBalance,
  HermesExtractedTransaction,
  ScreenshotImportResponse,
} from "@/lib/hermes/types";

export const runtime = "nodejs";

function isValidRow(row: unknown): row is HermesExtractedTransaction {
  if (!row || typeof row !== "object") return false;
  const r = row as Record<string, unknown>;
  return (
    typeof r.date === "string" &&
    typeof r.description === "string" &&
    typeof r.counterparty === "string" &&
    typeof r.amount === "number" &&
    !Number.isNaN(r.amount) &&
    typeof r.category === "string" &&
    (r.entity === "personal" || r.entity === "avaken") &&
    typeof r.type === "string"
  );
}

/** Commits reviewed preview rows to Postgres (or mock ledger when DATABASE_URL is unset). */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      transactions?: unknown[];
      accountBalances?: unknown[];
      batchId?: string;
    };

    const rows = body.transactions;
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "No transactions to import" },
        { status: 400 },
      );
    }

    if (rows.length > 50) {
      return NextResponse.json(
        { success: false, error: "Maximum 50 transactions per import" },
        { status: 400 },
      );
    }

    if (!rows.every(isValidRow)) {
      return NextResponse.json(
        { success: false, error: "Invalid transaction payload — check entity, amount, and date" },
        { status: 400 },
      );
    }

    const accountBalances = Array.isArray(body.accountBalances)
      ? (body.accountBalances as HermesAccountBalance[])
      : undefined;

    const { storage, transactions: created } = await persistImportedTransactions(
      rows,
      accountBalances,
    );

    const response: ScreenshotImportResponse = {
      success: true,
      imported: created.length,
      ids: created.map((t) => t.id),
      storage,
      transactions: created,
      accountBalances,
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
