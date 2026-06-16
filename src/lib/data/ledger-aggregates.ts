import { getLedgerAccounts } from "./mock-account-balances";

export interface LedgerFinancialAggregates {
  personalBankTotal: number;
  avakenTideBalance: number;
  creditCardDebt: number;
  netPosition: number;
  consolidatedLiquid: number;
}

function isPersonalBankAccount(type: string): boolean {
  return type === "current" || type === "savings";
}

function isAvakenCashAccount(type: string): boolean {
  return type === "business" || type === "savings";
}

/** Derive dashboard totals from per-account ledger balances (source of truth). */
export function aggregatesFromLedger(): LedgerFinancialAggregates {
  const ledger = getLedgerAccounts();

  const personalBankTotal = ledger
    .filter((a) => a.entity === "personal" && isPersonalBankAccount(a.type))
    .reduce((sum, a) => sum + a.balance, 0);

  const creditCardDebt = ledger
    .filter((a) => a.entity === "personal" && a.type === "credit")
    .reduce((sum, a) => sum + Math.abs(a.balance), 0);

  const avakenTideBalance = ledger
    .filter((a) => a.entity === "avaken" && isAvakenCashAccount(a.type))
    .reduce((sum, a) => sum + a.balance, 0);

  const netPosition = personalBankTotal - creditCardDebt;

  return {
    personalBankTotal,
    avakenTideBalance,
    creditCardDebt,
    netPosition,
    consolidatedLiquid: netPosition + avakenTideBalance,
  };
}
