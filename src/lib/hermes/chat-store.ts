import type {
  HermesChatMessage,
  HermesMessageKind,
  HermesMessageRole,
  HermesNotificationSeverity,
} from "./chat-types";

const MAX_MESSAGES = 200;

type GlobalStore = { hermesChatMessages?: HermesChatMessage[] };

function store(): HermesChatMessage[] {
  const g = globalThis as unknown as GlobalStore;
  if (!g.hermesChatMessages) {
    g.hermesChatMessages = seedWelcomeMessage();
  }
  return g.hermesChatMessages;
}

function seedWelcomeMessage(): HermesChatMessage[] {
  return [
    {
      id: "welcome-hermes",
      role: "agent",
      kind: "chat",
      content:
        "I'm Hermes — your finance automation agent on the VPS. Ask me anything, or I'll push cron updates here when jobs finish.",
      read: true,
      createdAt: new Date().toISOString(),
    },
  ];
}

function sortMessages(messages: HermesChatMessage[]): HermesChatMessage[] {
  return [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

function trimStore(messages: HermesChatMessage[]): HermesChatMessage[] {
  if (messages.length <= MAX_MESSAGES) return messages;
  return messages.slice(messages.length - MAX_MESSAGES);
}

export function listHermesMessages(since?: string): HermesChatMessage[] {
  const all = sortMessages(store());
  if (!since) return all;
  const sinceMs = new Date(since).getTime();
  if (Number.isNaN(sinceMs)) return all;
  return all.filter((m) => new Date(m.createdAt).getTime() > sinceMs);
}

export function countUnreadHermesMessages(): number {
  return store().filter((m) => !m.read && m.kind === "notification").length;
}

export function appendHermesMessage(input: {
  role: HermesMessageRole;
  kind?: HermesMessageKind;
  content: string;
  title?: string;
  severity?: HermesNotificationSeverity;
  source?: string;
  read?: boolean;
  metadata?: Record<string, unknown>;
}): HermesChatMessage {
  const message: HermesChatMessage = {
    id: crypto.randomUUID(),
    role: input.role,
    kind: input.kind ?? "chat",
    content: input.content,
    title: input.title,
    severity: input.severity,
    source: input.source,
    read: input.read ?? input.kind !== "notification",
    createdAt: new Date().toISOString(),
    metadata: input.metadata,
  };

  const g = globalThis as unknown as GlobalStore;
  g.hermesChatMessages = trimStore([...store(), message]);
  return message;
}

export function markHermesMessagesRead(ids?: string[]): number {
  const g = globalThis as unknown as GlobalStore;
  let changed = 0;

  g.hermesChatMessages = store().map((m) => {
    const shouldMark = ids ? ids.includes(m.id) : m.kind === "notification" && !m.read;
    if (!shouldMark || m.read) return m;
    changed += 1;
    return { ...m, read: true };
  });

  return changed;
}

export function mergeHermesMessages(incoming: HermesChatMessage[]): HermesChatMessage[] {
  const byId = new Map(store().map((m) => [m.id, m]));
  for (const msg of incoming) {
    byId.set(msg.id, msg);
  }
  const g = globalThis as unknown as GlobalStore;
  g.hermesChatMessages = trimStore(sortMessages([...byId.values()]));
  return store();
}
