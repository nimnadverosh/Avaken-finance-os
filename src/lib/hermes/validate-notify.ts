import type { HermesNotifyPayload, HermesNotificationSeverity } from "./chat-types";

const SEVERITIES = new Set<HermesNotificationSeverity>(["info", "success", "warning", "error"]);

export function validateNotifyPayload(body: unknown):
  | { ok: true; data: HermesNotifyPayload }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Body must be a JSON object" };
  }

  const root = body as Record<string, unknown>;
  const title = typeof root.title === "string" ? root.title.trim() : "";
  const messageBody =
    (typeof root.body === "string" && root.body.trim()) ||
    (typeof root.message === "string" && root.message.trim()) ||
    (typeof root.content === "string" && root.content.trim()) ||
    "";

  if (!title) return { ok: false, error: "title is required" };
  if (!messageBody) return { ok: false, error: "body (or message) is required" };

  let severity: HermesNotificationSeverity = "info";
  if (typeof root.severity === "string" && SEVERITIES.has(root.severity as HermesNotificationSeverity)) {
    severity = root.severity as HermesNotificationSeverity;
  } else if (typeof root.kind === "string" && SEVERITIES.has(root.kind as HermesNotificationSeverity)) {
    severity = root.kind as HermesNotificationSeverity;
  }

  const source =
    (typeof root.source === "string" && root.source.trim()) ||
    (typeof root.job === "string" && `cron:${root.job.trim()}`) ||
    "hermes-cron";

  const metadata =
    root.metadata && typeof root.metadata === "object" && !Array.isArray(root.metadata)
      ? (root.metadata as Record<string, unknown>)
      : undefined;

  return {
    ok: true,
    data: {
      title,
      body: messageBody,
      severity,
      source,
      metadata,
    },
  };
}
