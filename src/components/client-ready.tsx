"use client";

import { useEffect } from "react";
import { markClientReady } from "@/lib/client-ready";

export function ClientReady() {
  useEffect(() => {
    markClientReady();
  }, []);
  return null;
}
