import { NextResponse } from "next/server";
import { hermesConfigured } from "@/lib/hermes/endpoint";
import {
  appendHermesMessage,
  countUnreadHermesMessages,
  listHermesMessages,
  markHermesMessagesRead,
} from "@/lib/hermes/chat-store";
import type { HermesMessagesResponse } from "@/lib/hermes/chat-types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const since = searchParams.get("since") ?? undefined;
  const markRead = searchParams.get("markRead") === "1";

  if (markRead) {
    markHermesMessagesRead();
  }

  const messages = listHermesMessages(since);
  const response: HermesMessagesResponse = {
    success: true,
    messages,
    unreadCount: countUnreadHermesMessages(),
    status: {
      configured: hermesConfigured(),
      mode: hermesConfigured() ? "live" : "demo",
    },
  };

  return NextResponse.json(response);
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as { ids?: string[] };
    const changed = markHermesMessagesRead(Array.isArray(body.ids) ? body.ids : undefined);
    return NextResponse.json({ success: true, marked: changed });
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }
}
