import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { CHIEF_COMPLAINTS } from "@/lib/ai/historyEngine";
import { uid } from "@/lib/utils/id";
import { DraftPatient } from "@/types/patient";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { category } = await req.json();

  const draft: DraftPatient = {
    id: uid(),
    name: "Guest Patient",
    age: "—",
    gender: "—",
    abhaId: null,
    chiefComplaintCategory: category,
    chiefComplaintLabel: CHIEF_COMPLAINTS.find((c) => c.key === category)?.label || category,
    answers: {},
    documents: [],
    docProcessingStage: null,
  };

  const { error } = await supabaseServer.from("kiosk_sessions").update({ draft, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ draft });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patch: Partial<DraftPatient> = await req.json();

  const { data: existing, error: fetchError } = await supabaseServer
    .from("kiosk_sessions")
    .select("draft")
    .eq("id", id)
    .single();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!existing.draft) return NextResponse.json({ error: "no active draft" }, { status: 400 });

  const merged: DraftPatient = {
    ...existing.draft,
    ...patch,
    answers: patch.answers ? { ...existing.draft.answers, ...patch.answers } : existing.draft.answers,
  };

  const { error } = await supabaseServer.from("kiosk_sessions").update({ draft: merged, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ draft: merged });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await supabaseServer.from("kiosk_sessions").update({ draft: null, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
