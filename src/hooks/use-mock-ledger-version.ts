"use client";

import { useEffect, useState } from "react";
import { MOCK_LEDGER_CHANGED } from "@/lib/data/mock-ledger";

/** Bumps when mock imports are added or cleared so client lists recompute. */
export function useMockLedgerVersion(): number {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const onChange = () => setVersion((v) => v + 1);
    window.addEventListener(MOCK_LEDGER_CHANGED, onChange);
    return () => window.removeEventListener(MOCK_LEDGER_CHANGED, onChange);
  }, []);

  return version;
}
