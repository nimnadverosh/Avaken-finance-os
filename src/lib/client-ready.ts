/**
 * Gate client-only storage reads until after React hydration (prevents SSR mismatch crashes).
 *
 * All localStorage-backed modules must call `isClientReady()` before reading:
 * - mock-account-balances, mock-ledger, daily-updates
 * - accounts-store, tiktok/store, tiktok/accounts
 *
 * UI that renders stored data should use `useClientStorageReady()` or `useMockDataVersion()`.
 */

let ready = false;

export const CLIENT_READY = "avaken-client-ready";

export function markClientReady(): void {
  if (ready || typeof window === "undefined") return;
  ready = true;
  window.dispatchEvent(new CustomEvent(CLIENT_READY));
}

export function isClientReady(): boolean {
  return ready && typeof window !== "undefined";
}
