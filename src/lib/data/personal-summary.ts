import {
  PERSONAL_BANK_ACCOUNT_IDS,
  PERSONAL_CREDIT_ACCOUNT_IDS,
} from "@/lib/import/account-resolution";
import type { Entity } from "./types";
import { getDailyFinancialSnapshot } from "./daily-updates";
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

/** Aggregates personal bank cash vs credit card debt from synced account balances. */
export function getPersonalFinancialSummary(): PersonalFinancialSummary {
  const snapshot = getDailyFinancialSnapshot();
  if (snapshot) {
    return {
      bankBalances: snapshot.personalBankTotal,
      creditCardDebt: snapshot.creditCardDebt,
      netPosition: snapshot.netPosition,
    };
  }

  const ledger = getLedgerAccounts().filter((a) => a.entity === "personal");

  const bankBalances = PERSONAL_BANK_ACCOUNT_IDS.reduce((sum, id) => {
    const acct = ledger.find((a) => a.id === id);
    return sum + (acct?.balance ?? 0);
  }, 0);

  const creditCardDebt = PERSONAL_CREDIT_ACCOUNT_IDS.reduce((sum, id) => {
    const acct = ledger.find((a) => a.id === id);
    return sum + Math.abs(acct?.balance ?? 0);
  }, 0);

  return {
    bankBalances,
    creditCardDebt,
    netPosition: bankBalances - creditCardDebt,
  };
}

export function getConsolidatedFinancialSummary(): ConsolidatedFinancialSummary {
  const personal = getPersonalFinancialSummary();
  const snapshot = getDailyFinancialSnapshot();
  const avakenTideBalance =
    snapshot?.avakenTideBalance ??
    getLedgerAccounts().find((a) => a.id === "tide")?.balance ??
    0;

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
