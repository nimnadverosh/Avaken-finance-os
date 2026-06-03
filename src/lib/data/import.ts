import { auditLog } from "./mock";
import { prependMockImports } from "./mock-ledger";
import type { HermesExtractedTransaction } from "@/lib/hermes/types";
import type { Transaction } from "./types";

const DEFAULT_ACCOUNT: Record<"personal" | "avaken", string> = {
  personal: "starling",
  avaken: "tide",
};

function vatForEntity(amount: number, entity: "personal" | "avaken", vat?: number): number {
  if (typeof vat === "number" && !Number.isNaN(vat)) return vat;
  if (entity === "personal" || amount >= 0) return 0;
  return Math.round((amount / 1.2) * 0.2 * 100) / 100;
}

export function extractedToTransaction(row: HermesExtractedTransaction, id?: string): Transaction {
  return {
    id: id ?? `t-${crypto.randomUUID().slice(0, 12)}`,
    date: row.date,
    description: row.description.trim() || "Imported transaction",
    counterparty: row.counterparty.trim() || "Unknown",
    amount: row.amount,
    category: row.category.trim() || "Uncategorised",
    type: row.type,
    entity: row.entity,
    accountId: DEFAULT_ACCOUNT[row.entity],
    vat: vatForEntity(row.amount, row.entity, row.vat),
    aiCategorised: true,
    status: "cleared",
  };
}

function recordImportAudit(created: Transaction[], batchId: string | undefined, action: string) {
  const summary = `${created.length} transaction${created.length === 1 ? "" : "s"} imported`;
  auditLog.unshift({
    id: `a-${crypto.randomUUID().slice(0, 8)}`,
    at: new Date().toISOString(),
    actor: "hermes",
    action,
    entity: created[0]?.entity ?? "avaken",
    ref: batchId ?? "import-batch",
    summary,
  });
}

/** Inserts already-built transactions (e.g. from Postgres) into the in-memory ledger for UI. */
export function prependTransactionsToMock(
  created: Transaction[],
  batchId?: string,
  action = "screenshot.import",
) {
  if (created.length === 0) return;
  prependMockImports(created);
  recordImportAudit(created, batchId, action);
}

export function appendImportedTransactions(
  rows: HermesExtractedTransaction[],
  batchId?: string,
): Transaction[] {
  const created = rows.map((r) => extractedToTransaction(r));
  prependTransactionsToMock(created, batchId);
  return created;
}
