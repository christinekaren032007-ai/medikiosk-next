import { NextResponse } from "next/server";
import { DOCTOR_COOKIE_NAME } from "@/lib/auth/doctorAuth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(DOCTOR_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}
