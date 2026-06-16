import { NextResponse, type NextRequest } from "next/server";
import {
  appPasswordConfigured,
  isPublicPath,
  readSessionCookie,
  sessionTokenFromCookieValue,
} from "@/lib/auth/session-edge";

export async function middleware(request: NextRequest) {
  if (!appPasswordConfigured()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const password = process.env.APP_PASSWORD!.trim();
  const token = readSessionCookie(request.headers.get("cookie"));
  if (await sessionTokenFromCookieValue(token, password)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
