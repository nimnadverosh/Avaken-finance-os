/** Gate client-only storage reads until after React hydration (prevents SSR mismatch crashes). */

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
