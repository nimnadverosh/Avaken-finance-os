/** Edge-safe session helpers (Web Crypto — usable in middleware). */

export const SESSION_COOKIE = "avaken-session";

export function appPasswordConfigured(): boolean {
  return Boolean(process.env.APP_PASSWORD?.trim());
}

export function readSessionCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) return rest.join("=");
  }
  return null;
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function expectedSessionToken(password: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("avaken-session-v1"));
  return bufferToHex(sig);
}

export async function sessionTokenFromCookieValue(
  value: string | undefined | null,
  password: string,
): Promise<boolean> {
  if (!value) return false;
  const expected = await expectedSessionToken(password);
  return value === expected;
}

/** Paths that stay public when APP_PASSWORD is set. */
export function isPublicPath(pathname: string): boolean {
  if (pathname === "/login") return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/favicon")) return true;
  if (pathname === "/api/auth/login") return true;
  if (pathname === "/api/import/json") return true;
  if (pathname === "/api/hermes/notify") return true;
  return false;
}
