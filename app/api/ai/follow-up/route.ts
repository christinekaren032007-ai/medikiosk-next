import { NextRequest, NextResponse } from "next/server";
import { getFollowUpQuestions } from "@/lib/ai/gemini";
import { FamilyHistoryEntry } from "@/types/clinical";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { chiefComplaintLabel, answers, familyHistory, noFamilyHistory } = (await req.json()) as {
    chiefComplaintLabel: string;
    answers: Record<string, unknown>;
    familyHistory?: FamilyHistoryEntry[];
    noFamilyHistory?: boolean;
  };

  try {
    const { questions, error } = await getFollowUpQuestions({
      chiefComplaintLabel,
      answers: answers || {},
      familyHistory,
      noFamilyHistory,
    });
    return NextResponse.json({ questions, error });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "unknown error" }, { status: 500 });
  }
}
