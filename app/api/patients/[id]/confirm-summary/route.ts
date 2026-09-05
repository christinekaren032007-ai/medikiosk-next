import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { rowToPatient } from "@/lib/server/patientMapping";

export const dynamic = "force-dynamic";

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: existing, error: fetchError } = await supabaseServer.from("patients").select("doctor_review").eq("id", id).single();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  const doctorReview = {
    confirmed: true,
    edited: existing.doctor_review?.edited || false,
    reviewer: "Dr. On Duty",
    timestamp: new Date().toISOString(),
  };

  const { data, error } = await supabaseServer.from("patients").update({ doctor_review: doctorReview }).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ patient: rowToPatient(data) });
}
