"use client";

import { useRouter } from "next/navigation";
import { Mic } from "lucide-react";
import { Card, ChipButton } from "@/components/shared/Primitives";
import Button from "@/components/shared/Button";
import ProgressSteps from "@/components/shared/ProgressSteps";
import FloatingNav from "@/components/shared/FloatingNav";
import { useMediKioskStore } from "@/lib/data/store";
import { CHIEF_COMPLAINTS, PATIENT_COMPLAINT_OPTIONS } from "@/lib/ai/historyEngine";
import { ComplaintCategory } from "@/types/clinical";

const STEPS = ["Visit", "Consent", "Records", "Complaint", "Intake", "Documents", "Review", "Complete"];

export default function ComplaintPage() {
  const router = useRouter();
  const hydrated = useMediKioskStore((s) => s.hydrated);
  const visitType = useMediKioskStore((s) => s.visitType);
  const startPatient = useMediKioskStore((s) => s.startPatient);

  if (!hydrated) return null;
  if (!visitType) {
    router.replace("/patient");
    return null;
  }

  async function pickComplaint(category: ComplaintCategory) {
    await startPatient(category);
    if (useMediKioskStore.getState().draft) router.push("/patient/history");
  }

  const options = PATIENT_COMPLAINT_OPTIONS.map((key) => CHIEF_COMPLAINTS.find((c) => c.key === key)!);

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-8">
      <FloatingNav />
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="font-serif-display text-2xl font-semibold text-teal-900">Rapha</div>
            <div className="text-xs text-stone-500">AYUSH Clinical Case-Taking Assistant</div>
          </div>
          <ProgressSteps steps={STEPS} activeIndex={3} />
        </div>

        <Card className="p-8">
          <h2 className="font-serif-display text-xl font-semibold text-teal-900 mb-1">What brings you here today?</h2>
          <p className="text-sm text-stone-500 mb-6">Select what best describes your main concern, or tap the microphone to describe it in your own words. This helps us ask the right follow-up questions.</p>
          <div className="grid sm:grid-cols-2 gap-2 mb-6">
            {options.map((c) => (
              <ChipButton key={c.key} selected={false} onClick={() => pickComplaint(c.key)}>{c.label}</ChipButton>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-stone-400 mb-6">
            <Mic size={14} className="text-teal-700" /> Voice input is also available once you're in the intake conversation.
          </div>
          <Button variant="ghost" onClick={() => router.push(visitType === "returning" ? "/patient/records" : "/patient/consent")} className="w-full">Back</Button>
        </Card>
      </div>
    </div>
  );
}
