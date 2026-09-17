import { NextRequest, NextResponse } from "next/server";
import { getFollowUpQuestions } from "@/lib/ai/gemini";
import { FamilyHistoryEntry } from "@/types/clinical";

export const dynamic = "force-dynamic";
// Gemini calls here can take up to ~15s; Vercel's default serverless
// function timeout (10s on Hobby) is shorter than that, so without this
// the platform kills the function before Gemini (or our own timeout)
// ever gets to respond, and the client hangs waiting for a response that
// never arrives instead of getting a clean success or error.
export const maxDuration = 30;

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
