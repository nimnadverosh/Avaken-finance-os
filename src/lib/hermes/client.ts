import type { HermesAnalyzeResult, HermesEntityHint } from "./types";
import { hermesApiKey, hermesConfigured, resolveHermesAnalyzeUrl } from "./endpoint";
import { parseHermesResponse } from "./parse-response";
import { mockHermesAnalyze } from "./mock-analyze";

const HERMES_TIMEOUT_MS = 90_000;

function parseHttpError(status: number, body: string): HermesAnalyzeResult {
  let message = body.trim();
  try {
    const json = JSON.parse(body) as { detail?: unknown; error?: string; message?: string };
    if (typeof json.error === "string") message = json.error;
    else if (typeof json.message === "string") message = json.message;
    else if (typeof json.detail === "string") message = json.detail;
    else if (Array.isArray(json.detail) && json.detail[0] && typeof json.detail[0] === "object") {
      const d = json.detail[0] as { msg?: string };
      if (d.msg) message = d.msg;
    }
  } catch {
    /* use raw body */
  }

  if (!message) {
    message =
      status === 401 || status === 403
        ? "Invalid Hermes API key"
        : status === 413
          ? "Images too large for Hermes"
          : status === 422
            ? "Hermes could not read one or more images"
            : `Hermes Agent returned ${status}`;
  }

  const code =
    status === 401 || status === 403
      ? "HERMES_REJECTED"
      : status === 422
        ? "BAD_IMAGE"
        : status === 413
          ? "VALIDATION"
          : "HERMES_UNAVAILABLE";

  return { success: false, error: message, code };
}

/**
 * Forwards screenshot buffers to Hermes Agent on the user's VPS.
 * Images exist only in memory; nothing is written to disk on Finance OS.
 */
export async function analyzeScreenshotsWithHermes(
  files: { name: string; type: string; buffer: Buffer }[],
  entityHint: HermesEntityHint,
): Promise<HermesAnalyzeResult> {
  if (!hermesConfigured()) {
    return mockHermesAnalyze(files.length, entityHint);
  }

  const endpoint = resolveHermesAnalyzeUrl()!;
  const apiKey = hermesApiKey()!;

  const body = new FormData();
  for (const file of files) {
    const blob = new Blob([new Uint8Array(file.buffer)], { type: file.type || "image/jpeg" });
    body.append("files", blob, file.name);
  }
  body.append("entity", entityHint);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HERMES_TIMEOUT_MS);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "X-Avaken-Client": "finance-os",
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timer);

    const text = await res.text().catch(() => "");

    if (!res.ok) {
      return parseHttpError(res.status, text);
    }

    let payload: unknown;
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      return {
        success: false,
        error: "Hermes returned invalid JSON",
        code: "INTERNAL",
      };
    }

    const parsed = parseHermesResponse(payload, entityHint);
    if (!parsed.ok) {
      return {
        success: false,
        error: parsed.error,
        code: "BAD_IMAGE",
      };
    }

    return parsed.data;
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      return {
        success: false,
        error: "Hermes took too long — try fewer or smaller screenshots",
        code: "TIMEOUT",
      };
    }
    const msg = err instanceof Error ? err.message : "Failed to reach Hermes Agent";
    const isNetwork =
      msg.includes("fetch failed") ||
      msg.includes("ECONNREFUSED") ||
      msg.includes("ENOTFOUND") ||
      msg.includes("ETIMEDOUT");
    return {
      success: false,
      error: isNetwork
        ? "Cannot reach Hermes Agent on your VPS. Check HERMES_AGENT_URL and that the server is running."
        : msg,
      code: "HERMES_UNAVAILABLE",
    };
  }
}
