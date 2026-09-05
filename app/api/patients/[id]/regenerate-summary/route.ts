import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { buildSummary } from "@/lib/ai/summaryEngine";
import { rowToPatient } from "@/lib/server/patientMapping";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: existing, error: fetchError } = await supabaseServer.from("patients").select("history, documents").eq("id", id).single();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  const summary = buildSummary(existing.history, existing.documents);
  const doctorReview = { confirmed: false, edited: false, reviewer: null, timestamp: null };

  const { data, error } = await supabaseServer
    .from("patients")
    .update({ summary, doctor_review: doctorReview })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ patient: rowToPatient(data) });
}
