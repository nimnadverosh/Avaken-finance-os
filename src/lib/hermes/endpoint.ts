const ANALYZE_PATH = "/api/analyze_screenshots";

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

export function hermesApiKey(): string | null {
  const key = process.env.HERMES_AGENT_API_KEY?.trim();
  return key || null;
}

export function hermesConfigured(): boolean {
  return Boolean(resolveHermesAnalyzeUrl() && hermesApiKey());
}
