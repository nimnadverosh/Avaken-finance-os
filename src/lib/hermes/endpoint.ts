const ANALYZE_PATH = "/api/analyze_screenshots";
const CHAT_PATH = "/api/chat";

/** Base Hermes VPS URL without path segments. */
export function resolveHermesBaseUrl(): string | null {
  const raw = process.env.HERMES_AGENT_URL?.trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    return `${url.protocol}//${url.host}`;
  } catch {
    return raw.replace(/\/$/, "").replace(/\/api\/.*$/, "");
  }
}

/** Resolves the full Hermes analyze URL from HERMES_AGENT_URL (base or full path). */
export function resolveHermesAnalyzeUrl(): string | null {
  const raw = process.env.HERMES_AGENT_URL?.trim();
  if (!raw) return null;

  if (raw.includes("analyze_screenshots")) {
    return raw.replace(/\/$/, "");
  }

  const base = raw.replace(/\/$/, "");
  return `${base}${ANALYZE_PATH}`;
}

/** Resolves the Hermes conversational endpoint on your VPS. */
export function resolveHermesChatUrl(): string | null {
  const base = resolveHermesBaseUrl();
  if (!base) return null;
  return `${base}${CHAT_PATH}`;
}

export function hermesApiKey(): string | null {
  const key = process.env.HERMES_AGENT_API_KEY?.trim();
  return key || null;
}

export function hermesConfigured(): boolean {
  return Boolean(resolveHermesAnalyzeUrl() && hermesApiKey());
}
