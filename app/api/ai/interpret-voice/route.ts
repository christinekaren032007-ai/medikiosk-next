import { NextRequest, NextResponse } from "next/server";
import { interpretVoiceAnswer } from "@/lib/ai/gemini";
import { InterviewFieldType } from "@/types/clinical";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { transcript, type, question, options } = (await req.json()) as {
    transcript?: string;
    type?: InterviewFieldType;
    question?: string;
    options?: string[];
  };
  if (!transcript?.trim() || !type || !question) return NextResponse.json({ result: null });

  const result = await interpretVoiceAnswer(transcript, { type, question, options });
  return NextResponse.json({ result });
}
