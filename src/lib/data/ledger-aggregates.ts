import {
  PERSONAL_BANK_ACCOUNT_IDS,
  PERSONAL_CREDIT_ACCOUNT_IDS,
} from "@/lib/import/account-resolution";
import { getLedgerAccounts } from "./mock-account-balances";

export interface LedgerFinancialAggregates {
  personalBankTotal: number;
  avakenTideBalance: number;
  creditCardDebt: number;
  netPosition: number;
  consolidatedLiquid: number;
}

/** Derive dashboard totals from per-account ledger balances (source of truth). */
export function aggregatesFromLedger(): LedgerFinancialAggregates {
  const ledger = getLedgerAccounts();

  const personalBankTotal = PERSONAL_BANK_ACCOUNT_IDS.reduce((sum, id) => {
    return sum + (ledger.find((a) => a.id === id)?.balance ?? 0);
  }, 0);

  const creditCardDebt = PERSONAL_CREDIT_ACCOUNT_IDS.reduce((sum, id) => {
    const balance = ledger.find((a) => a.id === id)?.balance ?? 0;
    return sum + Math.abs(balance);
  }, 0);

  const avakenTideBalance = ledger.find((a) => a.id === "tide")?.balance ?? 0;
  const netPosition = personalBankTotal - creditCardDebt;

  return {
    personalBankTotal,
    avakenTideBalance,
    creditCardDebt,
    netPosition,
    consolidatedLiquid: netPosition + avakenTideBalance,
  };
}
