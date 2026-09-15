import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { SCENARIOS } from "@/lib/demo/scenarios";
import { complaintLabel } from "@/lib/ai/historyEngine";
import { mockExtractDocument } from "@/lib/ai/documentEngine";
import { uid } from "@/lib/utils/id";
import { DraftPatient } from "@/types/patient";

export const dynamic = "force-dynamic";

type ScenarioKey = "fever" | "joint_pain" | "digestive" | "headache";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { key } = (await req.json()) as { key: ScenarioKey };
  const preset = SCENARIOS[key];

  const doc = mockExtractDocument(preset.keys[0]);
  doc.reviewStatus = "confirmed";
  doc.confirmed = true;

  const draft: DraftPatient = {
    id: uid(),
    name: preset.name,
    age: preset.age,
    gender: preset.gender,
    abhaId: preset.abhaId,
    chiefComplaints: preset.keys,
    chiefComplaintLabel: complaintLabel(preset.keys),
    answers: preset.answers,
    documents: [doc],
    docProcessingStage: "done",
  };

  const { error } = await supabaseServer.from("kiosk_sessions").update({ draft, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ draft });
}
