import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const patch: Record<string, any> = { updated_at: new Date().toISOString() };
  if (body.lang !== undefined) patch.lang = body.lang;

  const { data, error } = await supabaseServer.from("kiosk_sessions").update(patch).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ lang: data.lang });
}
