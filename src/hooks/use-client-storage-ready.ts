"use client";

import { useEffect, useState } from "react";
import { CLIENT_READY, isClientReady } from "@/lib/client-ready";

/**
 * True only after React hydration and {@link markClientReady} has run.
 * Use to defer rendering UI that depends on localStorage-backed data.
 */
export function useClientStorageReady(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isClientReady()) {
      setReady(true);
      return;
    }
    const onReady = () => setReady(true);
    window.addEventListener(CLIENT_READY, onReady);
    return () => window.removeEventListener(CLIENT_READY, onReady);
  }, []);

  return ready;
}
