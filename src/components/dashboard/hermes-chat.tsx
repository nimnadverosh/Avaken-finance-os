"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Bot,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock3,
  Info,
  Loader2,
  Radio,
  SendHorizontal,
  Sparkles,
  Zap,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useHermesChat } from "@/hooks/use-hermes-chat";
import { formatDate, greeting } from "@/lib/format";
import type { HermesChatMessage, HermesNotificationSeverity } from "@/lib/hermes/chat-types";
import { cn } from "@/lib/utils";

type FeedFilter = "all" | "chat" | "cron";

const QUICK_PROMPTS = [
  { label: "Status", message: "What's your current status?" },
  { label: "Cron jobs", message: "What cron jobs are scheduled?" },
  { label: "Last sync", message: "When did the last balance sync run?" },
] as const;

const inputClass =
  "w-full resize-none rounded-xl border border-border/70 bg-white/[0.03] px-4 py-3 pr-12 text-sm text-foreground outline-none transition-colors placeholder:text-subtle focus:border-primary/40 focus:ring-2 focus:ring-primary/20";

export function HermesChat() {
  const {
    messages,
    notifications,
    status,
    unreadCount,
    sending,
    error,
    sendMessage,
    markAllRead,
    clearError,
  } = useHermesChat();

  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [cronOpen, setCronOpen] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const filtered = useMemo(() => {
    if (filter === "chat") return messages.filter((m) => m.kind === "chat");
    if (filter === "cron") return messages.filter((m) => m.kind === "notification");
    return messages;
  }, [messages, filter]);

  const lastActivity = messages[messages.length - 1]?.createdAt;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [filtered.length, sending]);

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft("");
    clearError();
    await sendMessage(text);
    inputRef.current?.focus();
  }, [draft, sending, sendMessage, clearError]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const connectionLabel = status.configured
    ? status.mode === "live"
      ? "Live on VPS"
      : "Configured"
    : "Demo mode";

  const connectionTone = status.configured ? "positive" : "warning";

  return (
    <Card className="relative overflow-hidden border-violet/25 bg-gradient-to-br from-violet/[0.07] via-card to-card p-0 shadow-[0_0_0_1px_rgba(167,139,250,0.14),0_24px_64px_-32px_rgba(167,139,250,0.28)]">
      <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-violet/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-1/3 size-48 rounded-full bg-primary/10 blur-3xl" />

      {/* Header */}
      <div className="relative border-b border-border/60 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="relative grid size-11 shrink-0 place-items-center rounded-2xl bg-violet/15 ring-1 ring-violet/30">
              <Bot className="size-5 text-violet" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ring-2 ring-card">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet">
                  {greeting()}
                </p>
                <Badge tone={connectionTone}>
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      status.configured ? "bg-positive animate-pulse" : "bg-warning",
                    )}
                  />
                  {connectionLabel}
                </Badge>
                {unreadCount > 0 && (
                  <Badge tone="info">
                    <Bell className="size-3" />
                    {unreadCount} new
                  </Badge>
                )}
              </div>
              <h2 className="mt-1 text-lg font-semibold tracking-tight sm:text-xl">
                Hermes Agent
                <span className="ml-2 text-sm font-normal text-muted-foreground">· command centre</span>
              </h2>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Chat with your VPS agent and receive cron job updates — balance syncs, imports, and
                automation alerts land here in real time.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {lastActivity && (
              <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-white/[0.03] px-3 py-2 text-[11px] text-muted-foreground">
                <Clock3 className="size-3.5 shrink-0" />
                Last activity{" "}
                <span className="font-medium text-foreground">
                  {formatDate(lastActivity, {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setExpanded((v) => !v)}
              className="h-9"
            >
              <ChevronDown className={cn("size-3.5 transition-transform", !expanded && "-rotate-90")} />
              {expanded ? "Collapse" : "Expand"}
            </Button>
          </div>
        </div>
      </div>

      {expanded && (
        <>
          {/* Filter tabs */}
          <div className="relative flex items-center gap-1 border-b border-border/60 px-5 py-2.5 sm:px-6">
            <FeedTab active={filter === "all"} onClick={() => setFilter("all")} label="All" count={messages.length} />
            <FeedTab
              active={filter === "chat"}
              onClick={() => setFilter("chat")}
              label="Chat"
              count={messages.filter((m) => m.kind === "chat").length}
            />
            <FeedTab
              active={filter === "cron"}
              onClick={() => setFilter("cron")}
              label="Cron"
              count={notifications.length}
              highlight={unreadCount > 0}
            />
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="ml-auto text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Message feed */}
          <div
            ref={scrollRef}
            className="relative max-h-[min(52vh,420px)] min-h-[220px] space-y-3 overflow-y-auto px-5 py-4 sm:px-6"
          >
            {filtered.length === 0 ? (
              <EmptyFeed filter={filter} />
            ) : (
              filtered.map((message, index) => (
                <MessageBubble key={message.id} message={message} index={index} />
              ))
            )}

            {sending && (
              <div className="flex items-start gap-2.5 animate-fade-up">
                <AgentAvatar />
                <div className="rounded-2xl rounded-tl-md border border-border/60 bg-white/[0.03] px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin text-violet" />
                    Hermes is thinking…
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick prompts */}
          <div className="relative flex flex-wrap gap-2 border-t border-border/60 px-5 py-3 sm:px-6">
            <span className="mr-1 self-center text-[10px] font-medium uppercase tracking-wider text-subtle">
              Quick
            </span>
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt.label}
                type="button"
                disabled={sending}
                onClick={() => {
                  setDraft(prompt.message);
                  inputRef.current?.focus();
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-white/[0.02] px-3 py-1 text-[11px] text-muted-foreground transition-colors hover:border-violet/30 hover:bg-violet/10 hover:text-foreground disabled:opacity-50"
              >
                <Zap className="size-3 text-violet" />
                {prompt.label}
              </button>
            ))}
          </div>

          {/* Composer */}
          <div className="relative space-y-3 border-t border-border/60 px-5 py-4 sm:px-6">
            <div className="relative">
              <textarea
                ref={inputRef}
                rows={2}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Message Hermes on your VPS… (Enter to send, Shift+Enter for newline)"
                className={inputClass}
                disabled={sending}
              />
              <Button
                type="button"
                size="icon"
                disabled={!draft.trim() || sending}
                onClick={() => void handleSend()}
                className="absolute bottom-2.5 right-2.5 size-9 rounded-lg shadow-[0_4px_20px_-6px_rgba(167,139,250,0.6)]"
                aria-label="Send message"
              >
                {sending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <SendHorizontal className="size-4" />
                )}
              </Button>
            </div>

            {error && (
              <p className="rounded-lg border border-negative/30 bg-negative/10 px-3 py-2 text-sm text-negative">
                {error}
              </p>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-[11px] text-subtle">
                <Radio className="size-3" />
                Cron jobs POST to{" "}
                <code className="rounded bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  /api/hermes/notify
                </code>
              </p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={!draft.trim() || sending}
                onClick={() => void handleSend()}
                className="text-violet hover:text-violet"
              >
                <Sparkles className="size-3.5" />
                Send to Hermes
              </Button>
            </div>
          </div>

          {/* Cron history drawer */}
          {notifications.length > 0 && (
            <div className="border-t border-border/60 px-5 py-3 sm:px-6">
              <button
                type="button"
                onClick={() => setCronOpen((open) => !open)}
                className="flex w-full items-center justify-between py-1 text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <span>
                  Cron feed{" "}
                  <span className="text-subtle">
                    · {notifications.length} notification{notifications.length === 1 ? "" : "s"}
                  </span>
                </span>
                <ChevronDown
                  className={cn("size-4 transition-transform", cronOpen && "rotate-180")}
                />
              </button>

              {cronOpen && (
                <ul className="mt-2 space-y-2 pb-2">
                  {[...notifications].reverse().slice(0, 8).map((entry) => (
                    <li
                      key={entry.id}
                      className={cn(
                        "flex flex-col gap-1 rounded-xl border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between",
                        entry.read
                          ? "border-border/60 bg-white/[0.02]"
                          : "border-primary/25 bg-primary/[0.04]",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <SeverityIcon severity={entry.severity ?? "info"} />
                        <div>
                          <p className="text-xs font-medium">{entry.title ?? "Cron update"}</p>
                          <p className="mt-0.5 line-clamp-2 text-[11px] text-subtle">{entry.content}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1 text-[10px] text-muted-foreground">
                        <span>
                          {formatDate(entry.createdAt, {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {entry.source && <span className="font-mono text-subtle">{entry.source}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function FeedTab({
  active,
  onClick,
  label,
  count,
  highlight,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  highlight?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-violet/15 text-violet ring-1 ring-violet/25"
          : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
      )}
    >
      {label}
      <span
        className={cn(
          "tabular rounded-full px-1.5 py-0.5 text-[10px]",
          active ? "bg-violet/20" : "bg-white/[0.05]",
          highlight && !active && "text-primary",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function MessageBubble({ message, index }: { message: HermesChatMessage; index: number }) {
  if (message.kind === "notification") {
    return <NotificationCard message={message} index={index} />;
  }

  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  return (
    <div
      className={cn(
        "flex animate-fade-up",
        isUser ? "justify-end" : "justify-start",
      )}
      style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}
    >
      <div className={cn("flex max-w-[min(100%,520px)] items-end gap-2", isUser && "flex-row-reverse")}>
        {!isUser && <AgentAvatar small={isSystem} />}
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "rounded-tr-md bg-primary/15 text-foreground ring-1 ring-primary/25"
              : isSystem
                ? "rounded-tl-md border border-negative/25 bg-negative/8 text-negative"
                : "rounded-tl-md border border-border/60 bg-white/[0.03] text-foreground",
          )}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
          <p className="mt-1.5 text-[10px] tabular text-subtle">
            {formatDate(message.createdAt, { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </div>
    </div>
  );
}

function NotificationCard({ message, index }: { message: HermesChatMessage; index: number }) {
  const severity = message.severity ?? "info";

  return (
    <div
      className="animate-fade-up"
      style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}
    >
      <div
        className={cn(
          "flex gap-3 rounded-2xl border px-4 py-3",
          !message.read && "ring-1 ring-primary/20",
          severity === "success" && "border-positive/25 bg-positive/[0.06]",
          severity === "warning" && "border-warning/25 bg-warning/[0.06]",
          severity === "error" && "border-negative/25 bg-negative/[0.06]",
          severity === "info" && "border-info/25 bg-info/[0.06]",
        )}
      >
        <div
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-xl",
            severity === "success" && "bg-positive/15 text-positive",
            severity === "warning" && "bg-warning/15 text-warning",
            severity === "error" && "bg-negative/15 text-negative",
            severity === "info" && "bg-info/15 text-info",
          )}
        >
          <SeverityIcon severity={severity} className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold tracking-tight">{message.title ?? "Cron update"}</p>
            {!message.read && (
              <Badge tone="positive" className="h-5">
                <Circle className="size-2 fill-current" />
                New
              </Badge>
            )}
            {message.source && (
              <span className="font-mono text-[10px] text-subtle">{message.source}</span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{message.content}</p>
          <p className="mt-2 text-[10px] tabular text-subtle">
            {formatDate(message.createdAt, {
              weekday: "short",
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>
    </div>
  );
}

function AgentAvatar({ small }: { small?: boolean }) {
  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center rounded-xl bg-violet/15 ring-1 ring-violet/25",
        small ? "size-7" : "size-8",
      )}
    >
      <Bot className={cn("text-violet", small ? "size-3.5" : "size-4")} />
    </div>
  );
}

function SeverityIcon({
  severity,
  className,
}: {
  severity: HermesNotificationSeverity;
  className?: string;
}) {
  const cls = cn("shrink-0", className);
  if (severity === "success") return <CheckCircle2 className={cls} />;
  if (severity === "warning") return <AlertTriangle className={cls} />;
  if (severity === "error") return <AlertTriangle className={cls} />;
  return <Info className={cls} />;
}

function EmptyFeed({ filter }: { filter: FeedFilter }) {
  const copy =
    filter === "cron"
      ? "No cron notifications yet. Point your Hermes VPS jobs at POST /api/hermes/notify."
      : filter === "chat"
        ? "Start a conversation — ask about status, syncs, or scheduled jobs."
        : "Your Hermes feed is empty. Send a message or wait for the next cron update.";

  return (
    <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-3 text-center">
      <div className="grid size-12 place-items-center rounded-2xl bg-violet/10 ring-1 ring-violet/20">
        <Bot className="size-6 text-violet/80" />
      </div>
      <p className="max-w-sm text-sm text-muted-foreground">{copy}</p>
    </div>
  );
}
