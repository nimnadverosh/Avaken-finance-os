"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  HermesChatMessage,
  HermesChatSendResponse,
  HermesChatStatus,
  HermesMessagesResponse,
} from "@/lib/hermes/chat-types";

const STORAGE_KEY = "avaken-hermes-chat";
const POLL_MS = 12_000;
const HERMES_CHAT_CHANGED = "avaken-hermes-chat-changed";
const FETCH_OPTIONS: RequestInit = { cache: "no-store" };

function loadCachedMessages(): HermesChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isMessage);
  } catch {
    return [];
  }
}

function persistMessages(messages: HermesChatMessage[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-200)));
  window.dispatchEvent(new CustomEvent(HERMES_CHAT_CHANGED));
}

function isMessage(value: unknown): value is HermesChatMessage {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.role === "string" &&
    typeof v.kind === "string" &&
    typeof v.content === "string" &&
    typeof v.createdAt === "string" &&
    typeof v.read === "boolean"
  );
}

function mergeById(existing: HermesChatMessage[], incoming: HermesChatMessage[]): HermesChatMessage[] {
  const map = new Map(existing.map((m) => [m.id, m]));
  for (const msg of incoming) {
    map.set(msg.id, msg);
  }
  return [...map.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export function useHermesChat() {
  const [messages, setMessages] = useState<HermesChatMessage[]>(() => loadCachedMessages());
  const [status, setStatus] = useState<HermesChatStatus>({ configured: false, mode: "demo" });
  const [unreadCount, setUnreadCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastPollRef = useRef<string | null>(null);

  const syncMessages = useCallback((next: HermesChatMessage[] | ((prev: HermesChatMessage[]) => HermesChatMessage[])) => {
    setMessages((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      persistMessages(resolved);
      setUnreadCount(resolved.filter((m) => m.kind === "notification" && !m.read).length);
      return resolved;
    });
  }, []);

  const refresh = useCallback(async (opts?: { markRead?: boolean; full?: boolean }) => {
    try {
      const params = new URLSearchParams();
      if (!opts?.full && lastPollRef.current) params.set("since", lastPollRef.current);
      if (opts?.markRead) params.set("markRead", "1");

      const query = params.toString();
      const url = query ? `/api/hermes/messages?${query}` : "/api/hermes/messages";
      let res = await fetch(url, FETCH_OPTIONS);

      // Stale CDN edge after deploy — retry once with a full fetch.
      if (res.status === 404) {
        lastPollRef.current = null;
        res = await fetch("/api/hermes/messages", FETCH_OPTIONS);
      }

      if (!res.ok) return;

      const data = (await res.json()) as HermesMessagesResponse;
      if (!data.success) return;

      setError(null);
      setStatus(data.status);
      setUnreadCount(data.unreadCount);

      const merged = mergeById(loadCachedMessages(), data.messages);
      if (merged.length > 0) {
        lastPollRef.current = merged[merged.length - 1]!.createdAt;
      }
      syncMessages(merged);
    } catch {
      /* offline — keep cached messages */
    }
  }, [syncMessages]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    const onStorage = () => syncMessages(loadCachedMessages());
    window.addEventListener(HERMES_CHAT_CHANGED, onStorage);
    return () => window.removeEventListener(HERMES_CHAT_CHANGED, onStorage);
  }, [syncMessages]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return false;

      setSending(true);
      setError(null);

      const optimistic: HermesChatMessage = {
        id: `pending-${Date.now()}`,
        role: "user",
        kind: "chat",
        content: trimmed,
        read: true,
        createdAt: new Date().toISOString(),
      };
      syncMessages((prev) => mergeById(prev, [optimistic]));

      try {
        const res = await fetch("/api/hermes/chat", {
          ...FETCH_OPTIONS,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed }),
        });

        const data = (await res.json()) as HermesChatSendResponse & {
          error?: string;
          userMessage?: HermesChatMessage;
          agentMessage?: HermesChatMessage;
        };

        if (!res.ok || !data.success) {
          const err = data.error ?? "Hermes did not respond";
          setError(err);
          if (data.userMessage && data.agentMessage) {
            syncMessages((prev) =>
              mergeById(
                prev.filter((m) => m.id !== optimistic.id),
                [data.userMessage!, data.agentMessage!],
              ),
            );
          } else {
            syncMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
          }
          return false;
        }

        syncMessages((prev) =>
          mergeById(prev.filter((m) => m.id !== optimistic.id), [
            data.userMessage,
            data.agentMessage,
          ]),
        );
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send message");
        syncMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        return false;
      } finally {
        setSending(false);
      }
    },
    [sending, syncMessages],
  );

  const markAllRead = useCallback(async () => {
    await fetch("/api/hermes/messages?markRead=1", FETCH_OPTIONS);
    syncMessages((prev) =>
      prev.map((m) => (m.kind === "notification" ? { ...m, read: true } : m)),
    );
  }, [syncMessages]);

  const notifications = useMemo(
    () => messages.filter((m) => m.kind === "notification"),
    [messages],
  );

  return {
    messages,
    notifications,
    status,
    unreadCount,
    sending,
    error,
    sendMessage,
    markAllRead,
    refresh,
    clearError: () => setError(null),
  };
}
