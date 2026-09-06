import { NextRequest, NextResponse, unstable_after as after } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { buildSummary } from "@/lib/ai/summaryEngine";
import { evaluateRedFlag } from "@/lib/ai/redFlagEngine";
import { getClinicalNarrative } from "@/lib/ai/gemini";
import { uid, nextToken } from "@/lib/utils/id";
import { PatientRecord } from "@/types/patient";
import { patientToRow } from "@/lib/server/patientMapping";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: session, error: fetchError } = await supabaseServer
    .from("kiosk_sessions")
    .select("draft")
    .eq("id", id)
    .single();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  const draft = session.draft;
  if (!draft) return NextResponse.json({ error: "no active draft" }, { status: 400 });

  const history = {
    chiefComplaintCategory: draft.chiefComplaintCategory,
    chiefComplaintLabel: draft.chiefComplaintLabel,
    answers: draft.answers,
    familyHistory: draft.familyHistory || [],
    noFamilyHistory: draft.noFamilyHistory || false,
    aiFollowUp: draft.aiFollowUp || [],
  };
  const summary = buildSummary(history, draft.documents);
  const redFlag = evaluateRedFlag(draft.chiefComplaintCategory, draft.answers);

  const { count } = await supabaseServer.from("patients").select("*", { count: "exact", head: true });
  const token = nextToken(count || 0);

  const record: PatientRecord = {
    id: draft.id,
    name: draft.name,
    age: draft.age,
    gender: draft.gender,
    abhaId: draft.abhaId,
    token,
    history,
    documents: draft.documents,
    timeline: [
      { id: uid(), year: "2024", label: "Diabetes diagnosed" },
      { id: uid(), year: "2025", label: "Hypertension documented" },
      ...(draft.documents.length ? [{ id: uid(), year: "Aug 2026", label: `${draft.documents[0].documentType} uploaded` }] : []),
      { id: uid(), year: "Today", label: "Intake completed at kiosk" },
    ],
    summary,
    redFlag,
    doctorReview: { confirmed: false, edited: false, reviewer: null, timestamp: null },
    consent: { granted: true, timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), consentTextVersion: "v1" },
    priority: redFlag.triggered ? "high" : "normal",
    aiStatus: "ready",
    status: "Waiting",
    createdAt: new Date().toISOString(),
  };

  const { error: insertError } = await supabaseServer.from("patients").insert(patientToRow(record));
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

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
        await supabaseServer
          .from("patients")
          .update({ summary: { ...summary, aiNarrative, aiGenerated: true } })
          .eq("id", record.id);
      }
    } catch (err) {
      console.error("[ai-narrative] background enrichment failed:", err);
    }
  });

  return NextResponse.json({ token });
}
