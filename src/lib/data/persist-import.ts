import { hasDatabase } from "@/db/index";
import { importTransactionsToDatabase } from "@/lib/db/import-transactions";
import { persistHermesAccountBalances } from "@/lib/db/persist-balances";
import { extractedToTransaction } from "./import";
import type { HermesAccountBalance, HermesExtractedTransaction } from "@/lib/hermes/types";
import type { Transaction } from "./types";

export async function persistImportedTransactions(
  rows: HermesExtractedTransaction[],
  accountBalances?: HermesAccountBalance[],
): Promise<{ storage: "database" | "mock"; transactions: Transaction[] }> {
  if (hasDatabase()) {
    try {
      const transactions = await importTransactionsToDatabase(rows);
      await persistHermesAccountBalances(accountBalances);
      return { storage: "database", transactions };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Database import failed";
      throw new Error(message);
    }
  }

  const transactions = rows.map((r) => extractedToTransaction(r));
  return { storage: "mock", transactions };
}
