import { hermesApiKey, hermesConfigured, resolveHermesChatUrl } from "./endpoint";
import type { HermesChatMessage } from "./chat-types";

const CHAT_TIMEOUT_MS = 45_000;

function mockReply(message: string): string {
  const lower = message.toLowerCase().trim();

  if (lower.includes("status") || lower.includes("health")) {
    return "Hermes is idle. Cron jobs: morning sync (06:00 UTC), screenshot queue (hourly). Last successful run was this morning — connect your VPS for live status.";
  }
  if (lower.includes("cron") || lower.includes("schedule") || lower.includes("job")) {
    return "Scheduled jobs on your VPS can POST to Finance OS at `/api/hermes/notify` with a Bearer token. I'll surface those updates in this feed automatically.";
  }
  if (lower.includes("sync") || lower.includes("balance") || lower.includes("import")) {
    return "Run your balance sync cron on the VPS, then POST the summary here via `/api/hermes/notify`. You can also paste Hermes JSON at Import → JSON.";
  }
  if (lower.includes("help") || lower === "?") {
    return "Commands I understand: status, cron schedule, sync balances. Cron notifications appear as cards in this feed. Set HERMES_AGENT_URL for live chat against your VPS.";
  }

  return `Demo mode — I received: “${message.slice(0, 120)}${message.length > 120 ? "…" : ""}”. Set HERMES_AGENT_URL on Finance OS and expose /api/chat on your Hermes VPS for live replies.`;
}

function parseAgentText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;

  const direct =
    (typeof root.reply === "string" && root.reply) ||
    (typeof root.message === "string" && root.message) ||
    (typeof root.response === "string" && root.response) ||
    (typeof root.content === "string" && root.content) ||
    (typeof root.text === "string" && root.text);

  if (direct) return direct;

  if (Array.isArray(root.messages)) {
    const last = root.messages[root.messages.length - 1];
    if (last && typeof last === "object") {
      const m = last as Record<string, unknown>;
      if (typeof m.content === "string") return m.content;
      if (typeof m.text === "string") return m.text;
    }
  }

  return null;
}

export type HermesChatResult =
  | { ok: true; reply: string; live: boolean }
  | { ok: false; error: string };

/**
 * Sends a user message to Hermes Agent on the VPS (/api/chat).
 * Falls back to contextual demo replies when the VPS is not configured.
 */
export async function sendMessageToHermes(message: string): Promise<HermesChatResult> {
  const trimmed = message.trim();
  if (!trimmed) {
    return { ok: false, error: "Message cannot be empty" };
  }

  if (!hermesConfigured()) {
    return { ok: true, reply: mockReply(trimmed), live: false };
  }

  const endpoint = resolveHermesChatUrl()!;
  const apiKey = hermesApiKey()!;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "X-Avaken-Client": "finance-os",
      },
      body: JSON.stringify({ message: trimmed }),
      signal: controller.signal,
    });

    clearTimeout(timer);
    const text = await res.text().catch(() => "");

    if (!res.ok) {
      let err = text.trim();
      try {
        const json = JSON.parse(text) as { error?: string; detail?: string; message?: string };
        err = json.error ?? json.message ?? json.detail ?? err;
      } catch {
        /* use raw */
      }
      return {
        ok: false,
        error: err || `Hermes chat returned ${res.status}`,
      };
    }

    let payload: unknown;
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      return { ok: false, error: "Hermes returned invalid JSON" };
    }

    const reply = parseAgentText(payload);
    if (!reply) {
      return { ok: false, error: "Hermes response did not include a reply field" };
    }

    return { ok: true, reply, live: true };
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, error: "Hermes took too long to respond" };
    }
    const msg = err instanceof Error ? err.message : "Failed to reach Hermes";
    const isNetwork =
      msg.includes("fetch failed") ||
      msg.includes("ECONNREFUSED") ||
      msg.includes("ENOTFOUND") ||
      msg.includes("ETIMEDOUT");
    return {
      ok: false,
      error: isNetwork
        ? "Cannot reach Hermes Agent on your VPS. Check HERMES_AGENT_URL and that /api/chat is running."
        : msg,
    };
  }
}

export function toAgentMessage(reply: string): Omit<HermesChatMessage, "id" | "createdAt"> {
  return {
    role: "agent",
    kind: "chat",
    content: reply,
    read: true,
  };
}

export function toUserMessage(content: string): Omit<HermesChatMessage, "id" | "createdAt"> {
  return {
    role: "user",
    kind: "chat",
    content,
    read: true,
  };
}
