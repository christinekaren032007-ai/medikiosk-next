import { NextRequest, NextResponse } from "next/server";
import { getFollowUpQuestion } from "@/lib/ai/gemini";
import { FollowUpQA } from "@/types/clinical";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { chiefComplaintLabel, answers, priorFollowUp } = (await req.json()) as {
    chiefComplaintLabel: string;
    answers: Record<string, unknown>;
    priorFollowUp: FollowUpQA[];
  };

  const question = await getFollowUpQuestion({
    chiefComplaintLabel,
    answers: answers || {},
    priorFollowUp: priorFollowUp || [],
  });

  return NextResponse.json({ question });
}
