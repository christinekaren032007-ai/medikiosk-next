import { NextRequest, NextResponse } from "next/server";
import { DOCTOR_COOKIE_NAME } from "@/lib/auth/doctorAuth";

export function middleware(req: NextRequest) {
  const password = process.env.DOCTOR_PASSWORD;
  const cookie = req.cookies.get(DOCTOR_COOKIE_NAME)?.value;

  if (!password || cookie === password) {
    return NextResponse.next();
  }

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/doctor-login", req.url);
  loginUrl.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/doctor", "/doctor/:path*", "/api/patients/:path*"],
};
