import { supabaseServer } from "@/lib/supabase/server";
import { seedDrafts } from "@/lib/demo/mockPatients";
import { findOrCreatePatientId, insertConsultationTree } from "@/lib/server/db";

export async function seedIfEmpty() {
  const { count } = await supabaseServer.from("patients").select("*", { count: "exact", head: true });
  if (count && count > 0) return;
  for (const draft of seedDrafts()) {
    const patientId = await findOrCreatePatientId(draft, "en");
    await insertConsultationTree({ patientId, draft, aiStatus: "ready" });
  }
}
