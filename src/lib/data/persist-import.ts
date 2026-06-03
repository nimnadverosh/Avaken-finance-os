import { hasDatabase } from "@/db/index";
import { importTransactionsToDatabase } from "@/lib/db/import-transactions";
import { extractedToTransaction } from "./import";
import type { HermesExtractedTransaction } from "@/lib/hermes/types";
import type { Transaction } from "./types";

export async function persistImportedTransactions(
  rows: HermesExtractedTransaction[],
): Promise<{ storage: "database" | "mock"; transactions: Transaction[] }> {
  if (hasDatabase()) {
    try {
      const transactions = await importTransactionsToDatabase(rows);
      return { storage: "database", transactions };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Database import failed";
      throw new Error(message);
    }
  }

  const transactions = rows.map((r) => extractedToTransaction(r));
  return { storage: "mock", transactions };
}
