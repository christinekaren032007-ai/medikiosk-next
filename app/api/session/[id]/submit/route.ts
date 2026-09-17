import { NextRequest, NextResponse, unstable_after as after } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getClinicalNarrative } from "@/lib/ai/gemini";
import { findOrCreatePatientId, insertConsultationTree, markAiSummaryReady } from "@/lib/server/db";

export const dynamic = "force-dynamic";

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

  // AI narrative is a best-effort enrichment on top of the rule-based summary above
  // (which already ran and was saved) — generated in the background after responding
  // so the patient is never kept waiting on it, and never blocked if it fails.
  after(async () => {
    try {
      const aiNarrative = await getClinicalNarrative({ history, documents: draft.documents });
      if (aiNarrative) {
        await markAiSummaryReady(consultationId, { ...summary, aiNarrative, aiGenerated: true });
      } else {
        await markAiSummaryReady(consultationId, summary);
      }
    } catch (err) {
      console.error("[ai-narrative] background enrichment failed:", err);
      await markAiSummaryReady(consultationId, summary).catch(() => {});
    }
  });

  return NextResponse.json({ token, consultationId });
}
