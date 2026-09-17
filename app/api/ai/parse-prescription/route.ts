import { NextRequest, NextResponse } from "next/server";
import { parsePrescriptionText } from "@/lib/ai/gemini";

export const dynamic = "force-dynamic";
// parsePrescriptionText()'s internal timeout is 15s; see
// app/api/ai/follow-up/route.ts for why this must exceed Vercel's default
// 10s Hobby-plan function timeout.
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { text } = (await req.json()) as { text?: string };
  if (!text) return NextResponse.json({ medicines: null });

  const medicines = await parsePrescriptionText(text);
  return NextResponse.json({ medicines });
}
