import { applyMockAccountBalances } from "./mock-account-balances";
import type { HermesAccountBalance } from "@/lib/hermes/types";

/** Updates dashboard account balances from Hermes screenshot / JSON import (mock mode). */
export function applyHermesAccountBalances(updates: HermesAccountBalance[] | undefined): void {
  if (!updates?.length) return;
  applyMockAccountBalances(updates);
}
