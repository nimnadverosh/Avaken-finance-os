import type { HermesAccountBalance } from "@/lib/hermes/types";
import { hasDatabase } from "@/db/index";
import { updateAccountBalancesInDb } from "@/lib/db/write-balances";

/** Persist Hermes account balances to Postgres when DATABASE_URL is set. */
export async function persistHermesAccountBalances(
  updates: HermesAccountBalance[] | undefined,
): Promise<number> {
  if (!hasDatabase() || !updates?.length) return 0;

  const map: Record<string, number> = {};
  for (const u of updates) {
    map[u.accountId] = u.balance;
  }
  return updateAccountBalancesInDb(map);
}
