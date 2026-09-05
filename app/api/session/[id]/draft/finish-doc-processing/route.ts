import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { mockExtractDocument } from "@/lib/ai/documentEngine";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: existing, error: fetchError } = await supabaseServer
    .from("kiosk_sessions")
    .select("draft")
    .eq("id", id)
    .single();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!existing.draft) return NextResponse.json({ error: "no active draft" }, { status: 400 });

  const doc = mockExtractDocument(existing.draft.chiefComplaintCategory);
  const merged = { ...existing.draft, documents: [doc], docProcessingStage: "done" };

  const { error } = await supabaseServer.from("kiosk_sessions").update({ draft: merged, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ draft: merged });
}
