"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileText, ShieldCheck } from "lucide-react";
import { Card, Badge } from "@/components/shared/Primitives";
import Button from "@/components/shared/Button";
import ProgressSteps from "@/components/shared/ProgressSteps";
import FloatingNav from "@/components/shared/FloatingNav";
import { useMediKioskStore } from "@/lib/data/store";

const STEPS = ["Visit", "Consent", "Records", "Complaint", "Intake", "Documents", "Review", "Complete"];

const DEMO_PREVIOUS_RECORD = {
  source: "ABHA-linked health record (simulated)",
  date: "12 Aug 2026",
  documentType: "Discharge Summary",
  fields: [
    { key: "Diagnosis", value: "Type 2 Diabetes Mellitus" },
    { key: "Medications", value: "Metformin 500 mg, Amlodipine 5 mg" },
    { key: "Procedures", value: "None" },
  ],
};

export default function PreviousRecordsPage() {
  const router = useRouter();
  const hydrated = useMediKioskStore((s) => s.hydrated);
  const visitType = useMediKioskStore((s) => s.visitType);
  const setPreviousRecordUsed = useMediKioskStore((s) => s.setPreviousRecordUsed);

  useEffect(() => {
    if (hydrated && visitType === "new") router.replace("/patient/complaint");
  }, [hydrated, visitType, router]);

  if (!hydrated) return null;
  if (!visitType) {
    router.replace("/patient");
    return null;
  }
  if (visitType === "new") return null;

  function choose(use: boolean) {
    setPreviousRecordUsed(use);
    router.push("/patient/complaint");
  }

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-8">
      <FloatingNav />
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="font-serif-display text-2xl font-semibold text-teal-900">Rapha</div>
            <div className="text-xs text-stone-500">AYUSH Clinical Case-Taking Assistant</div>
          </div>
          <ProgressSteps steps={STEPS} activeIndex={2} />
        </div>

        <Card className="p-8">
          <h2 className="font-serif-display text-xl font-semibold text-teal-900 mb-1">Previous Health Information</h2>
          <p className="text-sm text-stone-500 mb-6 leading-relaxed">
            Rapha doesn't keep its own copy of your medical records. With your consent, relevant previous information can be retrieved from India's ABHA/ABDM digital health-record ecosystem to avoid repeating questions — for this prototype, that retrieval is simulated.
          </p>

          <Card className="p-5 mb-6 bg-stone-50">
            <div className="flex items-center justify-between mb-3">
              <Badge tone="amber">DEMO / SIMULATED — not a real ABDM record</Badge>
              <div className="text-xs text-stone-400">{DEMO_PREVIOUS_RECORD.source}</div>
            </div>
            <div className="flex items-center gap-2 font-semibold text-sm text-stone-800 mb-2">
              <FileText size={16} className="text-teal-700" /> {DEMO_PREVIOUS_RECORD.documentType} — {DEMO_PREVIOUS_RECORD.date}
            </div>
            <div className="space-y-1.5">
              {DEMO_PREVIOUS_RECORD.fields.map((f) => (
                <div key={f.key} className="flex justify-between text-sm">
                  <span className="text-stone-500">{f.key}</span>
                  <span className="font-medium text-stone-700">{f.value}</span>
                </div>
              ))}
            </div>
          </Card>

          <div className="flex items-center gap-2 text-xs text-stone-400 mb-6">
            <ShieldCheck size={14} className="text-teal-700" /> Only used to prepare today's case summary — never shared without your consent.
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Button variant="secondary" onClick={() => choose(false)}>Don't use this information</Button>
            <Button onClick={() => choose(true)}>Use this information</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
