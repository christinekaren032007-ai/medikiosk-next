import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { rowToPatient } from "@/lib/server/patientMapping";
import { uid } from "@/lib/utils/id";
import { TreatmentFollowup, TreatmentResponseStatus } from "@/types/ai";

export const dynamic = "force-dynamic";

/**
 * Records a patient-reported treatment response for a return visit
 * (PS26047 section 14). Purely patient-reported information for the
 * practitioner to review — never used by the AI to judge treatment
 * effectiveness.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as Omit<TreatmentFollowup, "id" | "date"> & { status: TreatmentResponseStatus };

  const { data: existing, error: fetchError } = await supabaseServer.from("patients").select("treatment_followups").eq("id", id).single();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  const entry: TreatmentFollowup = {
    id: uid(),
    date: new Date().toISOString(),
    status: body.status,
    severity: body.severity,
    newSymptoms: body.newSymptoms,
    adherence: body.adherence,
    sideEffects: body.sideEffects,
  };
  const treatmentFollowups = [...(existing.treatment_followups || []), entry];

  const { data, error } = await supabaseServer.from("patients").update({ treatment_followups: treatmentFollowups }).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ patient: rowToPatient(data) });
}
