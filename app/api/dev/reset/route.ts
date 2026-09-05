import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { seedPatients } from "@/lib/demo/mockPatients";
import { patientToRow, rowToPatient } from "@/lib/server/patientMapping";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json();

  const { error: deleteError } = await supabaseServer.from("patients").delete().neq("id", "");
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  const rows = seedPatients().map(patientToRow);
  const { data, error: insertError } = await supabaseServer.from("patients").insert(rows).select();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  if (sessionId) {
    await supabaseServer
      .from("kiosk_sessions")
      .update({ draft: null, last_token: null, ayush_mode: false, lang: "en", updated_at: new Date().toISOString() })
      .eq("id", sessionId);
  }

  return NextResponse.json({ queue: data.map(rowToPatient) });
}
