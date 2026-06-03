import {
  PERSONAL_BANK_ACCOUNT_IDS,
  PERSONAL_CREDIT_ACCOUNT_IDS,
} from "@/lib/import/account-resolution";
import { getLedgerAccounts } from "./mock-account-balances";

export interface PersonalFinancialSummary {
  bankBalances: number;
  creditCardDebt: number;
  netPosition: number;
}

/** Aggregates personal bank cash vs credit card debt from synced account balances. */
export function getPersonalFinancialSummary(): PersonalFinancialSummary {
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
