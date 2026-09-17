import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Unauthenticated, patient-facing lookup of just enough information to show
 * a treatment plan after consultation — never the full clinical record
 * (that stays behind /api/patients, which requires doctor auth).
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await supabaseServer.from("patients").select("name, token, consultation").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ name: data.name, token: data.token, consultation: data.consultation ?? null });
}
