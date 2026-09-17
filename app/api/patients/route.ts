import { NextResponse } from "next/server";
import { seedIfEmpty } from "@/lib/server/seed";
import { fetchQueueRecords } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await seedIfEmpty();
    const queue = await fetchQueueRecords();
    return NextResponse.json({ queue });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "unknown error" }, { status: 500 });
  }
}
