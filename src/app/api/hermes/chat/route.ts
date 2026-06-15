import { NextResponse } from "next/server";
import { appendHermesMessage } from "@/lib/hermes/chat-store";
import { sendMessageToHermes } from "@/lib/hermes/chat-client";
import type { HermesChatSendResponse } from "@/lib/hermes/chat-types";

export const runtime = "nodejs";

const MAX_MESSAGE_LEN = 4000;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { message?: string };
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!message) {
      return NextResponse.json({ success: false, error: "message is required" }, { status: 400 });
    }
    if (message.length > MAX_MESSAGE_LEN) {
      return NextResponse.json(
        { success: false, error: `Message must be under ${MAX_MESSAGE_LEN} characters` },
        { status: 400 },
      );
    }

    const userMessage = appendHermesMessage({
      role: "user",
      kind: "chat",
      content: message,
      read: true,
    });

    const result = await sendMessageToHermes(message);
    if (!result.ok) {
      const errorMessage = appendHermesMessage({
        role: "system",
        kind: "chat",
        content: result.error,
        severity: "error",
        read: true,
      });
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          userMessage,
          agentMessage: errorMessage,
        },
        { status: 502 },
      );
    }

    const agentMessage = appendHermesMessage({
      role: "agent",
      kind: "chat",
      content: result.reply,
      read: true,
      metadata: { live: result.live },
    });

    const response: HermesChatSendResponse = {
      success: true,
      userMessage,
      agentMessage,
    };

    return NextResponse.json(response);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Chat failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
