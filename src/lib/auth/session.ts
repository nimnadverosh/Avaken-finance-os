import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "avaken-session";

/** Password gate for the dashboard. Set on Vercel before going live. */
export function appPassword(): string | null {
  const value = process.env.APP_PASSWORD?.trim();
  return value || null;
}

export function appPasswordConfigured(): boolean {
  return Boolean(appPassword());
}

/** Deterministic session token derived from APP_PASSWORD. */
export function expectedSessionToken(): string | null {
  const password = appPassword();
  if (!password) return null;
  return createHmac("sha256", password).update("avaken-session-v1").digest("hex");
}

function tokensEqual(expected: string, provided: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function sessionTokenFromCookieValue(value: string | undefined | null): boolean {
  const expected = expectedSessionToken();
  if (!expected || !value) return false;
  return tokensEqual(expected, value);
}

export function readSessionCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) return rest.join("=");
  }
  return null;
}

export function isAuthenticatedRequest(request: Request): boolean {
  if (!appPasswordConfigured()) return true;
  const token = readSessionCookie(request.headers.get("cookie"));
  return sessionTokenFromCookieValue(token);
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

export type AuthResult = { ok: true } | { ok: false; status: number; error: string };

export function verifyAppAuth(request: Request): AuthResult {
  if (isAuthenticatedRequest(request)) return { ok: true };
  return { ok: false, status: 401, error: "Unauthorized" };
}
