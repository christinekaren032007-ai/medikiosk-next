import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { seedIfEmpty } from "@/lib/server/seed";
import { rowToPatient } from "@/lib/server/patientMapping";

export const dynamic = "force-dynamic";

export async function GET() {
  await seedIfEmpty();
  const { data, error } = await supabaseServer.from("patients").select("*").order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ queue: data.map(rowToPatient) });
}
