import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { seedDrafts } from "@/lib/demo/mockPatients";
import { findOrCreatePatientId, insertConsultationTree, fetchQueueRecords } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json();

  try {
    // Deleting every patient cascades through consultations -> intake_answers /
    // ayush_assessments / ai_summaries / doctor_assessments / prescriptions ->
    // medicine_reminders via each table's ON DELETE CASCADE foreign key.
    const { error: deleteError } = await supabaseServer.from("patients").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

    for (const draft of seedDrafts()) {
      const patientId = await findOrCreatePatientId(draft, "en");
      await insertConsultationTree({ patientId, draft, aiStatus: "ready" });
    }

    if (sessionId) {
      await supabaseServer
        .from("kiosk_sessions")
        .update({ draft: null, last_token: null, ayush_mode: false, lang: "en", updated_at: new Date().toISOString() })
        .eq("id", sessionId);
    }

    const queue = await fetchQueueRecords();
    return NextResponse.json({ queue });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "unknown error" }, { status: 500 });
  }
}
