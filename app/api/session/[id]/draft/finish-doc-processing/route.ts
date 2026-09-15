import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { mockExtractDocument } from "@/lib/ai/documentEngine";
import { DocumentRecord } from "@/types/document";

export const dynamic = "force-dynamic";

/**
 * Appends a document to the draft. If the client already ran real
 * extraction (via /api/ai/extract-document) it passes the resulting
 * DocumentRecord; otherwise this falls back to the clearly-labeled demo
 * mock so the "Skip / use demo document" path still works.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { document?: DocumentRecord };

  const { data: existing, error: fetchError } = await supabaseServer
    .from("kiosk_sessions")
    .select("draft")
    .eq("id", id)
    .single();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!existing.draft) return NextResponse.json({ error: "no active draft" }, { status: 400 });

  const doc: DocumentRecord = body.document || mockExtractDocument(existing.draft.chiefComplaints?.[0] || "other");
  const merged = { ...existing.draft, documents: [...existing.draft.documents, doc], docProcessingStage: "done" };

  const { error } = await supabaseServer.from("kiosk_sessions").update({ draft: merged, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ draft: merged });
}
