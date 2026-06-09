"use client";

import { useEffect, useState } from "react";
import { DAILY_UPDATES_CHANGED } from "@/lib/data/daily-updates";
import { MOCK_ACCOUNTS_CHANGED } from "@/lib/data/mock-account-balances";
import { MOCK_LEDGER_CHANGED } from "@/lib/data/mock-ledger";

/** Re-renders lists when mock transactions, account balances, or daily updates change. */
export function useMockDataVersion(): number {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    window.addEventListener(MOCK_LEDGER_CHANGED, bump);
    window.addEventListener(MOCK_ACCOUNTS_CHANGED, bump);
    window.addEventListener(DAILY_UPDATES_CHANGED, bump);
    return () => {
      window.removeEventListener(MOCK_LEDGER_CHANGED, bump);
      window.removeEventListener(MOCK_ACCOUNTS_CHANGED, bump);
      window.removeEventListener(DAILY_UPDATES_CHANGED, bump);
    };
  }, []);

  return version;
}
