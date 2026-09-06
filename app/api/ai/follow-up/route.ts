import { NextRequest, NextResponse } from "next/server";
import { getFollowUpQuestion } from "@/lib/ai/gemini";
import { FollowUpQA, FamilyHistoryEntry } from "@/types/clinical";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { chiefComplaintLabel, answers, priorFollowUp, familyHistory, noFamilyHistory } = (await req.json()) as {
    chiefComplaintLabel: string;
    answers: Record<string, unknown>;
    priorFollowUp: FollowUpQA[];
    familyHistory?: FamilyHistoryEntry[];
    noFamilyHistory?: boolean;
  };

  const question = await getFollowUpQuestion({
    chiefComplaintLabel,
    answers: answers || {},
    priorFollowUp: priorFollowUp || [],
    familyHistory,
    noFamilyHistory,
  });

  return NextResponse.json({ question });
}
