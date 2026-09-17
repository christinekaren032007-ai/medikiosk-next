import { NextRequest, NextResponse } from "next/server";
import { saveDoctorAssessment, fetchConsultationRecord } from "@/lib/server/db";
import { Medicine } from "@/types/ai";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as {
    diagnosis: string;
    medicines: Medicine[];
    additionalInstructions: string;
    doctorNotes: string;
  };

  try {
    await saveDoctorAssessment(id, {
      diagnosis: body.diagnosis || "",
      medicines: body.medicines || [],
      additionalInstructions: body.additionalInstructions || "",
      doctorNotes: body.doctorNotes || "",
    });
    const patient = await fetchConsultationRecord(id);
    if (!patient) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ patient });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "unknown error" }, { status: 500 });
  }
}
