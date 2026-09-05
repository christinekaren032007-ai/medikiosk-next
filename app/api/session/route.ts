import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json();
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  const { data: existing } = await supabaseServer.from("kiosk_sessions").select("*").eq("id", sessionId).maybeSingle();
  if (existing) {
    return NextResponse.json({
      sessionId: existing.id,
      lang: existing.lang,
      ayushMode: existing.ayush_mode,
      draft: existing.draft,
      lastToken: existing.last_token,
    });
  }

  const { data: created, error } = await supabaseServer
    .from("kiosk_sessions")
    .insert({ id: sessionId })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    sessionId: created.id,
    lang: created.lang,
    ayushMode: created.ayush_mode,
    draft: created.draft,
    lastToken: created.last_token,
  });
}
