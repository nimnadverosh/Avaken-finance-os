const MESSAGES: Record<string, string> = {
  VALIDATION: "Check your images — supported formats are JPEG, PNG, WebP, and HEIC (max 8 MB each).",
  BAD_IMAGE: "Hermes could not read one or more screenshots. Try a clearer image or another app screen.",
  HERMES_REJECTED: "Hermes rejected the request — verify HERMES_AGENT_API_KEY on the server.",
  HERMES_UNAVAILABLE: "Hermes Agent is unreachable. Confirm your VPS is online and HERMES_AGENT_URL is correct.",
  TIMEOUT: "Analysis timed out. Try fewer screenshots or smaller file sizes.",
  INTERNAL: "Something went wrong on our side. Please try again.",
};

export function messageForAnalyzeError(
  data: { error?: string; code?: string },
  fallback = "Analysis failed",
): string {
  if (data.error?.trim()) return data.error.trim();
  if (data.code && data.code in MESSAGES) return MESSAGES[data.code];
  return fallback;
}

export function messageForImportError(data: { error?: string }, fallback = "Import failed"): string {
  return data.error?.trim() || fallback;
}
