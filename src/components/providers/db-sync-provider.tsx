"use client";

import { useEffect } from "react";
import { refreshDbLedger } from "@/lib/data/db-cache";
import { MOCK_LEDGER_CHANGED } from "@/lib/data/mock-ledger";

/** Loads Postgres ledger on mount and after imports that touch the DB. */
export function DbSyncProvider() {
  useEffect(() => {
    void refreshDbLedger();

    const onLedgerChange = () => {
      void refreshDbLedger();
    };

    window.addEventListener(MOCK_LEDGER_CHANGED, onLedgerChange);
    return () => window.removeEventListener(MOCK_LEDGER_CHANGED, onLedgerChange);
  }, []);

  return null;
}
