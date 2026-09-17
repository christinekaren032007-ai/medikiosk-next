import { NextRequest, NextResponse, unstable_after as after } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getCaseSummary } from "@/lib/ai/gemini";
import { findOrCreatePatientId, insertConsultationTree, markAiSummaryReady } from "@/lib/server/db";

export const dynamic = "force-dynamic";
// The unstable_after() callback below runs the Gemini case-summary call
// (~18s) after the response is sent, but it still counts against this
// function's execution budget — without extending it, Vercel can kill the
// function mid-background-job on Hobby's 10s default, leaving ai_status
// stuck at "processing" forever instead of ever reaching "ready".
export const maxDuration = 30;

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: session, error: fetchError } = await supabaseServer
    .from("kiosk_sessions")
    .select("draft, lang")
    .eq("id", id)
    .single();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  const draft = session.draft;
  if (!draft) return NextResponse.json({ error: "no active draft" }, { status: 400 });

  const patientId = await findOrCreatePatientId(draft, session.lang || "en");
  const { consultationId, token, summary, history } = await insertConsultationTree({ patientId, draft });

  const { error: sessionError } = await supabaseServer
    .from("kiosk_sessions")
    .update({ draft: null, last_token: token, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 });

  // The AI case summary is generated in the background after responding so
  // the patient is never kept waiting on it. The rule-based `summary` above
  // (already saved) stays visible to the doctor as the structured intake
  // data regardless of what happens here. On failure we record a visible
  // aiError rather than silently leaving the doctor thinking AI ran.
  after(async () => {
    try {
      const { narrative, error } = await getCaseSummary({
        patient: { name: draft.name, age: draft.age, gender: draft.gender },
        history,
        documents: draft.documents,
      });
      if (narrative) {
        await markAiSummaryReady(consultationId, { ...summary, aiNarrative: narrative, aiGenerated: true, aiError: undefined });
      } else {
        await markAiSummaryReady(consultationId, { ...summary, aiGenerated: false, aiError: error || "Gemini did not return a summary." });
      }
    } catch (err) {
      console.error("[ai-case-summary] background generation failed:", err);
      await markAiSummaryReady(consultationId, {
        ...summary,
        aiGenerated: false,
        aiError: err instanceof Error ? err.message : "AI case summary generation failed unexpectedly.",
      }).catch(() => {});
    }
  });

  return NextResponse.json({ token, consultationId });
}
