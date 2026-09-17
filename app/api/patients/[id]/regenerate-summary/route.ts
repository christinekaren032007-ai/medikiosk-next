import { NextRequest, NextResponse } from "next/server";
import { regenerateAiSummary, fetchConsultationRecord } from "@/lib/server/db";

export const dynamic = "force-dynamic";
// regenerateAiSummary() makes a synchronous Gemini call (~18s) awaited
// before responding — see app/api/ai/follow-up/route.ts for why this must
// exceed Vercel's default 10s Hobby-plan function timeout.
export const maxDuration = 30;

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await regenerateAiSummary(id);
    const patient = await fetchConsultationRecord(id);
    if (!patient) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ patient });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "unknown error" }, { status: 500 });
  }
}
