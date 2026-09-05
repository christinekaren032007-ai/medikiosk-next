"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, Edit3 } from "lucide-react";
import { Card } from "@/components/shared/Primitives";
import Button from "@/components/shared/Button";
import ProgressSteps from "@/components/shared/ProgressSteps";
import FloatingNav from "@/components/shared/FloatingNav";
import { useMediKioskStore } from "@/lib/data/store";
import { getFlow } from "@/lib/ai/historyEngine";
import { t } from "@/lib/i18n/translations";

const STEPS = ["Identify", "Consent", "History", "Documents", "Review", "Complete"];

export default function ReviewPage() {
  const router = useRouter();
  const hydrated = useMediKioskStore((s) => s.hydrated);
  const draft = useMediKioskStore((s) => s.draft);
  const ayushMode = useMediKioskStore((s) => s.ayushMode);
  const submitDraft = useMediKioskStore((s) => s.submitDraft);
  const lang = useMediKioskStore((s) => s.lang);

  if (!hydrated) return null;
  if (!draft) {
    router.replace("/patient");
    return null;
  }

  const flow = getFlow(ayushMode ? "ayush" : draft.chiefComplaintCategory);

  async function finish() {
    const token = await submitDraft();
    if (token) router.push("/patient/complete");
  }

  const sections: [string, string][] = [
    ["Personal Information", draft.name === "Guest Patient" ? "Guest patient" : `${draft.name}, ${draft.age} yrs, ${draft.gender}`],
    ["Chief Complaint", draft.chiefComplaintLabel],
    ...flow
      .filter((f) => draft.answers[f.id] !== undefined)
      .map((f): [string, string] => [f.question.split("?")[0], Array.isArray(draft.answers[f.id]) ? (draft.answers[f.id] as string[]).join(", ") : String(draft.answers[f.id])]),
    ["Uploaded Documents", draft.documents.length ? draft.documents[0].documentType : "None uploaded"],
  ];

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-8">
      <FloatingNav />
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="font-serif-display text-2xl font-semibold text-teal-900">MediKiosk</div>
            <div className="text-xs text-stone-500">Clinical Intake Assistant</div>
          </div>
          <ProgressSteps steps={STEPS} activeIndex={4} />
        </div>

        <Card className="p-8">
          <h2 className="font-serif-display text-xl font-semibold text-teal-900 mb-5">{t(lang, "reviewTitle")}</h2>
          <div className="space-y-4 mb-6">
            {sections.map(([k, v]) => (
              <div key={k} className="flex justify-between items-start border-b border-stone-100 pb-3">
                <div>
                  <div className="text-xs text-stone-400 mb-0.5">{k}</div>
                  <div className="text-sm font-medium">{v}</div>
                </div>
                <Edit3 size={14} className="text-stone-300" />
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => router.push("/patient/documents")}>Back</Button>
            <Button onClick={finish} icon={CheckCircle2} className="flex-1">{t(lang, "looksGood")}</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
