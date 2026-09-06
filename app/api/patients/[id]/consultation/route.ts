import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { rowToPatient } from "@/lib/server/patientMapping";
import { Consultation, Medicine } from "@/types/ai";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as {
    diagnosis: string;
    medicines: Medicine[];
    additionalInstructions: string;
    doctorNotes: string;
  };

  const consultation: Consultation = {
    diagnosis: body.diagnosis || "",
    medicines: body.medicines || [],
    additionalInstructions: body.additionalInstructions || "",
    doctorNotes: body.doctorNotes || "",
    completedAt: new Date().toISOString(),
  };

  const { data, error } = await supabaseServer
    .from("patients")
    .update({ consultation, status: "Completed" })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ patient: rowToPatient(data) });
}
