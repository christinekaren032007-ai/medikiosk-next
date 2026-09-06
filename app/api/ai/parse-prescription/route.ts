import { NextRequest, NextResponse } from "next/server";
import { parsePrescriptionText } from "@/lib/ai/gemini";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { text } = (await req.json()) as { text?: string };
  if (!text) return NextResponse.json({ medicines: null });

  const medicines = await parsePrescriptionText(text);
  return NextResponse.json({ medicines });
}
