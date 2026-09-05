import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { SCENARIOS } from "@/lib/demo/scenarios";
import { mockExtractDocument } from "@/lib/ai/documentEngine";
import { uid } from "@/lib/utils/id";
import { DraftPatient } from "@/types/patient";
import { ComplaintCategory } from "@/types/clinical";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { key } = (await req.json()) as { key: "chest_pain" | "fever" | "diabetes" | "ayush" };
  const preset = SCENARIOS[key];
  const category: ComplaintCategory = key;

  const draft: DraftPatient = {
    id: uid(),
    name: preset.name,
    age: preset.age,
    gender: preset.gender,
    abhaId: preset.abhaId,
    chiefComplaintCategory: category,
    chiefComplaintLabel: preset.ccLabel,
    answers: preset.answers,
    documents: [mockExtractDocument(category)],
    docProcessingStage: "done",
  };
  const ayushMode = key === "ayush";

  const { error } = await supabaseServer
    .from("kiosk_sessions")
    .update({ draft, ayush_mode: ayushMode, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ draft, ayushMode });
}
