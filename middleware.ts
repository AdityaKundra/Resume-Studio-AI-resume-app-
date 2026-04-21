import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { RESUME_SESSION_COOKIE } from "@/lib/session-constants";

export function middleware(request: NextRequest) {
  const res = NextResponse.next();
  if (!request.cookies.get(RESUME_SESSION_COOKIE)?.value) {
    res.cookies.set(RESUME_SESSION_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 400,
      secure: process.env.NODE_ENV === "production",
    });
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
