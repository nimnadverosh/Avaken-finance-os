import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import {
  appPassword,
  appPasswordConfigured,
  expectedSessionToken,
  SESSION_COOKIE,
} from "@/lib/auth/session";

export const runtime = "nodejs";

function passwordsEqual(expected: string, provided: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!appPasswordConfigured()) {
    return NextResponse.json({ ok: true, message: "Auth not configured" });
  }

  let body: { password?: string };
  try {
    body = (await request.json()) as { password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const provided = body.password?.trim() ?? "";
  const expected = appPassword()!;

  if (!passwordsEqual(expected, provided)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = expectedSessionToken()!;
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
