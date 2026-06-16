import { applyMockAccountBalances } from "./mock-account-balances";
import type { HermesAccountBalance } from "@/lib/hermes/types";

/** Updates dashboard account balances from Hermes screenshot / JSON import. */
export async function applyHermesAccountBalances(
  updates: HermesAccountBalance[] | undefined,
): Promise<void> {
  if (!updates?.length) return;
  await applyMockAccountBalances(updates);
}
