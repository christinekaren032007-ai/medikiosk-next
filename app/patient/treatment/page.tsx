"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pill, Bell, BellOff, ClipboardList } from "lucide-react";
import { Card, Badge } from "@/components/shared/Primitives";
import Button from "@/components/shared/Button";
import FloatingNav from "@/components/shared/FloatingNav";
import { useMediKioskStore } from "@/lib/data/store";
import { Consultation } from "@/types/ai";

export default function TreatmentPlanPage() {
  const router = useRouter();
  const hydrated = useMediKioskStore((s) => s.hydrated);
  const lastPatientId = useMediKioskStore((s) => s.lastPatientId);
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [reminders, setReminders] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!lastPatientId) return;
    let cancelled = false;
    async function poll() {
      const res = await fetch(`/api/treatment/${lastPatientId}`);
      if (cancelled) return;
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      const data = await res.json();
      setConsultation(data.consultation);
    }
    poll();
    const iv = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [lastPatientId]);

  function toggleReminder(i: number) {
    setReminders((r) => ({ ...r, [i]: !r[i] }));
  }

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-8">
      <FloatingNav />
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <div className="font-serif-display text-2xl font-semibold text-teal-900">Rapha</div>
          <div className="text-xs text-stone-500">Your Treatment Plan</div>
        </div>

        <Card className="p-8">
          {!hydrated || (!lastPatientId && !notFound) ? null : !lastPatientId || notFound ? (
            <>
              <div className="text-sm text-stone-500 mb-6">We couldn't find an active treatment plan for this session. This view is only available right after finishing an intake and seeing the doctor.</div>
              <Button variant="secondary" onClick={() => router.push("/patient")} className="w-full">Back to Kiosk</Button>
            </>
          ) : !consultation ? (
            <div className="p-6 text-center">
              <Loader2 size={26} className="mx-auto text-teal-700 animate-spin mb-4" />
              <div className="text-sm font-semibold text-stone-700 mb-1">Waiting for your doctor's consultation</div>
              <div className="text-xs text-stone-400">This page updates automatically once your doctor completes your visit.</div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-5">
                <ClipboardList size={18} className="text-teal-700" />
                <h2 className="font-serif-display text-xl font-semibold text-teal-900">Your Treatment Plan</h2>
              </div>

              {consultation.medicines.length > 0 && (
                <div className="space-y-3 mb-6">
                  {consultation.medicines.map((m, i) => (
                    <Card key={i} className="p-4 bg-stone-50">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 font-semibold text-sm text-stone-800"><Pill size={15} className="text-teal-700" /> {m.name}</div>
                        <button onClick={() => toggleReminder(i)} className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${reminders[i] ? "bg-teal-700 text-white" : "bg-stone-200 text-stone-500"}`}>
                          {reminders[i] ? <Bell size={12} /> : <BellOff size={12} />} Reminder
                        </button>
                      </div>
                      <div className="text-xs text-stone-500 mt-1.5">{[m.dosage, m.frequency, m.duration].filter(Boolean).join(" · ") || "See instructions below"}</div>
                    </Card>
                  ))}
                  <p className="text-[11px] text-stone-400">Reminders shown here are a visual demo only — this prototype doesn't send real notifications.</p>
                </div>
              )}

              {consultation.additionalInstructions && (
                <div className="mb-6">
                  <div className="text-xs font-semibold text-stone-500 mb-1.5">Additional Instructions</div>
                  <p className="text-sm text-stone-700">{consultation.additionalInstructions}</p>
                </div>
              )}

              <Badge tone="amber">Prepared by your doctor — always follow their instructions</Badge>

              <Button variant="secondary" onClick={() => router.push("/")} className="w-full mt-6">Done</Button>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
