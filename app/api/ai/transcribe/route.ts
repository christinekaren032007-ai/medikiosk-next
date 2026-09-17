import { NextRequest, NextResponse } from "next/server";
import { transcribeHandwriting } from "@/lib/ai/gemini";

export const dynamic = "force-dynamic";
// transcribeHandwriting()'s internal timeout is 25s; see
// app/api/ai/follow-up/route.ts for why this must exceed Vercel's default
// 10s Hobby-plan function timeout.
export const maxDuration = 45;

export async function POST(req: NextRequest) {
  const { imageBase64 } = (await req.json()) as { imageBase64?: string };
  if (!imageBase64) return NextResponse.json({ text: null, uncertain: false });

  const result = await transcribeHandwriting(imageBase64);
  return NextResponse.json(result);
}
