import { timingSafeEqual } from "node:crypto";

/** Inbound key for Hermes VPS → Finance OS JSON import (falls back to HERMES_AGENT_API_KEY). */
export function importJsonApiKey(): string | null {
  const dedicated = process.env.IMPORT_JSON_API_KEY?.trim();
  if (dedicated) return dedicated;
  const hermes = process.env.HERMES_AGENT_API_KEY?.trim();
  return hermes || null;
}

export function importJsonAuthConfigured(): boolean {
  return Boolean(importJsonApiKey());
}

function extractProvidedKey(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (header) {
    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    if (match?.[1]) return match[1].trim();
  }
  const apiKey = request.headers.get("x-api-key");
  if (apiKey?.trim()) return apiKey.trim();
  return null;
}

function keysEqual(expected: string, provided: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export type ImportAuthResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

/**
 * Requires a matching API key when configured.
 * In development only, allows unauthenticated calls when no key is set (local testing).
 */
export function verifyImportJsonAuth(request: Request): ImportAuthResult {
  const expected = importJsonApiKey();

  if (!expected) {
    if (process.env.NODE_ENV === "development") {
      return { ok: true };
    }
    return {
      ok: false,
      status: 503,
      error: "IMPORT_JSON_API_KEY is not configured on the server",
    };
  }

  const provided = extractProvidedKey(request);
  if (!provided || !keysEqual(expected, provided)) {
    return { ok: false, status: 401, error: "Invalid or missing API key" };
  }

  return { ok: true };
}
