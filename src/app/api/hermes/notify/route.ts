import { NextResponse } from "next/server";
import { verifyImportJsonAuth } from "@/lib/import/auth";
import { appendHermesMessage } from "@/lib/hermes/chat-store";
import { validateNotifyPayload } from "@/lib/hermes/validate-notify";
import type { HermesNotifyResponse } from "@/lib/hermes/chat-types";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 64 * 1024;

/**
 * Ingests cron / automation notifications from Hermes VPS.
 * Authenticate with Authorization: Bearer <key> or x-api-key (same as /api/import/json).
 */
export async function POST(request: Request) {
  try {
    const auth = verifyImportJsonAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const contentLength = request.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
      return NextResponse.json(
        { success: false, error: "Request body too large" },
        { status: 413 },
      );
    }

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { success: false, error: "Content-Type must be application/json" },
        { status: 415 },
      );
    }

    let body: unknown;
    try {
      const raw = await request.text();
      if (raw.length > MAX_BODY_BYTES) {
        return NextResponse.json(
          { success: false, error: "Request body too large" },
          { status: 413 },
        );
      }
      body = raw ? JSON.parse(raw) : null;
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const validated = validateNotifyPayload(body);
    if (!validated.ok) {
      return NextResponse.json({ success: false, error: validated.error }, { status: 400 });
    }

    const { title, body: messageBody, severity, source, metadata } = validated.data;

    const message = appendHermesMessage({
      role: "system",
      kind: "notification",
      title,
      content: messageBody,
      severity,
      source,
      read: false,
      metadata,
    });

    const response: HermesNotifyResponse = {
      success: true,
      message,
    };

    return NextResponse.json(response);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Notification ingest failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
