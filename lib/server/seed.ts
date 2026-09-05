import { supabaseServer } from "@/lib/supabase/server";
import { seedPatients } from "@/lib/demo/mockPatients";
import { patientToRow } from "@/lib/server/patientMapping";

export async function seedIfEmpty() {
  const { count } = await supabaseServer.from("patients").select("*", { count: "exact", head: true });
  if (count && count > 0) return;
  const rows = seedPatients().map(patientToRow);
  await supabaseServer.from("patients").insert(rows);
}
