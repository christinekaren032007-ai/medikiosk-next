import { NextRequest, NextResponse } from "next/server";
import { fetchTreatmentPlan } from "@/lib/server/db";

export const dynamic = "force-dynamic";

/**
 * Unauthenticated, patient-facing lookup of just enough information to show
 * a treatment plan after consultation — never the full clinical record
 * (that stays behind /api/patients, which requires doctor auth). `id` here
 * is the consultation id returned from /api/session/[id]/submit.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const plan = await fetchTreatmentPlan(id);
    if (!plan) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(plan);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "unknown error" }, { status: 500 });
  }
}
