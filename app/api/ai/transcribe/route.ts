import { NextRequest, NextResponse } from "next/server";
import { transcribeHandwriting } from "@/lib/ai/gemini";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { imageBase64 } = (await req.json()) as { imageBase64?: string };
  if (!imageBase64) return NextResponse.json({ text: null, uncertain: false });

  const result = await transcribeHandwriting(imageBase64);
  return NextResponse.json(result);
}
