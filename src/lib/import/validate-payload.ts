import { extractJsonImportRequest } from "@/lib/import/entity-resolution";
import { parseHermesResponse } from "@/lib/hermes/parse-response";
import type {
  HermesAccountBalance,
  HermesEntityHint,
  HermesExtractedTransaction,
} from "@/lib/hermes/types";
import type { TxnType } from "@/lib/data/types";

/** Automated JSON imports may carry larger batches than the screenshot review UI. */
export const MAX_JSON_IMPORT_TRANSACTIONS = 500;

const TXN_TYPES = new Set<TxnType>(["income", "expense", "payout", "transfer", "vat", "tax"]);

export function isValidExtractedRow(row: unknown): row is HermesExtractedTransaction {
  if (!row || typeof row !== "object") return false;
  const r = row as Record<string, unknown>;
  return (
    typeof r.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(r.date.slice(0, 10)) &&
    typeof r.description === "string" &&
    typeof r.counterparty === "string" &&
    typeof r.amount === "number" &&
    !Number.isNaN(r.amount) &&
    typeof r.category === "string" &&
    (r.entity === "personal" || r.entity === "avaken") &&
    typeof r.type === "string" &&
    TXN_TYPES.has(r.type as TxnType)
  );
}

export type JsonImportValidationResult =
  | {
      ok: true;
      transactions: HermesExtractedTransaction[];
      batchId: string;
      accountBalances?: HermesAccountBalance[];
    }
  | { ok: false; error: string };

/**
 * Accepts raw Hermes analyze JSON (or a minimal `{ transactions: [...] }` wrapper).
 */
export function validateHermesJsonImportBody(
  body: unknown,
  entityHint?: HermesEntityHint,
): JsonImportValidationResult {
  if (body === null || typeof body !== "object") {
    return { ok: false, error: "Request body must be a JSON object" };
  }

  const { payload, importEntityHint } = extractJsonImportRequest(body);
  const hint: HermesEntityHint = entityHint ?? importEntityHint;

  const parsed = parseHermesResponse(payload, hint);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  const { transactions, batchId, accountBalances } = parsed.data;

  if (transactions.length > MAX_JSON_IMPORT_TRANSACTIONS) {
    return {
      ok: false,
      error: `Maximum ${MAX_JSON_IMPORT_TRANSACTIONS} transactions per import`,
    };
  }

  if (!transactions.every(isValidExtractedRow)) {
    return {
      ok: false,
      error: "Invalid transaction payload — check entity, type, amount, and date",
    };
  }

  return { ok: true, transactions, batchId, accountBalances };
}
