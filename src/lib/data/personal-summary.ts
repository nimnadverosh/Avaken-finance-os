import type { Entity } from "./types";
import { aggregatesFromLedger } from "./ledger-aggregates";
import { getLedgerAccounts } from "./mock-account-balances";

export interface PersonalFinancialSummary {
  bankBalances: number;
  creditCardDebt: number;
  netPosition: number;
}

export interface ConsolidatedFinancialSummary extends PersonalFinancialSummary {
  avakenTideBalance: number;
  totalNetPosition: number;
}

/** Aggregates personal bank cash vs credit card debt from ledger balances. */
export function getPersonalFinancialSummary(): PersonalFinancialSummary {
  const { personalBankTotal, creditCardDebt, netPosition } = aggregatesFromLedger();
  return {
    bankBalances: personalBankTotal,
    creditCardDebt,
    netPosition,
  };
}

export function getConsolidatedFinancialSummary(): ConsolidatedFinancialSummary {
  const personal = getPersonalFinancialSummary();
  const avakenTideBalance =
    getLedgerAccounts().find((a) => a.id === "tide")?.balance ?? 0;

  return {
    ...personal,
    avakenTideBalance,
    totalNetPosition: personal.netPosition + avakenTideBalance,
  };
}

export function getFinancialSummaryForEntity(entity: Entity): PersonalFinancialSummary | ConsolidatedFinancialSummary {
  if (entity === "consolidated") return getConsolidatedFinancialSummary();
  return getPersonalFinancialSummary();
}
