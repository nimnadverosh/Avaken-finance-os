import { NextResponse } from "next/server";
import { verifyImportJsonAuth } from "@/lib/import/auth";
import { validateHermesJsonImportBody } from "@/lib/import/validate-payload";
import { persistImportedTransactions } from "@/lib/data/persist-import";
import type { JsonImportResponse } from "@/lib/hermes/types";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 2 * 1024 * 1024;

/**
 * Ingests Hermes analyze JSON from the VPS (or other trusted automation).
 * Authenticate with Authorization: Bearer <key> or x-api-key.
 */
export async function POST(request: Request) {
  try {
    const auth = verifyImportJsonAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const contentLength = request.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
      return NextResponse.json(
        { success: false, error: "Request body too large" },
        { status: 413 },
      );
    }

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { success: false, error: "Content-Type must be application/json" },
        { status: 415 },
      );
    }

    let body: unknown;
    try {
      const raw = await request.text();
      if (raw.length > MAX_BODY_BYTES) {
        return NextResponse.json(
          { success: false, error: "Request body too large" },
          { status: 413 },
        );
      }
      body = raw ? JSON.parse(raw) : null;
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const validated = validateHermesJsonImportBody(body);
    if (!validated.ok) {
      return NextResponse.json({ success: false, error: validated.error }, { status: 400 });
    }

    const { transactions, batchId, accountBalances } = validated;
    const { storage, transactions: created } = await persistImportedTransactions(transactions);

    const response: JsonImportResponse = {
      success: true,
      message: `Imported ${created.length} transaction${created.length === 1 ? "" : "s"} (${storage})`,
      imported: created.length,
      batchId,
      storage,
      ids: created.map((t) => t.id),
      transactions: created,
      accountBalances,
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
