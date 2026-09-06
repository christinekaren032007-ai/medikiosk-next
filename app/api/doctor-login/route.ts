import { NextRequest, NextResponse } from "next/server";
import { DOCTOR_COOKIE_NAME } from "@/lib/auth/doctorAuth";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const expected = process.env.DOCTOR_PASSWORD;

  if (!expected || password !== expected) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(DOCTOR_COOKIE_NAME, expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
