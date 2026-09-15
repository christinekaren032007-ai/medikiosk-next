"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, Edit3 } from "lucide-react";
import { Card, Badge } from "@/components/shared/Primitives";
import Button from "@/components/shared/Button";
import ProgressSteps from "@/components/shared/ProgressSteps";
import FloatingNav from "@/components/shared/FloatingNav";
import { useRaphaStore } from "@/lib/data/store";
import { getFullFlow } from "@/lib/ai/historyEngine";
import { computeCasePreparation } from "@/lib/ai/casePreparation";
import { t } from "@/lib/i18n/translations";

const STEPS = ["Identify", "Consent", "History", "Documents", "Review", "Complete"];

export default function ReviewPage() {
  const router = useRouter();
  const hydrated = useRaphaStore((s) => s.hydrated);
  const draft = useRaphaStore((s) => s.draft);
  const submitDraft = useRaphaStore((s) => s.submitDraft);
  const lang = useRaphaStore((s) => s.lang);

  if (!hydrated) return null;
  if (!draft) {
    router.replace("/patient");
    return null;
  }

  const flow = getFullFlow();
  const prep = computeCasePreparation(
    { chiefComplaints: draft.chiefComplaints, chiefComplaintOtherText: draft.chiefComplaintOtherText, chiefComplaintLabel: draft.chiefComplaintLabel, answers: draft.answers },
    draft.documents
  );

  async function finish() {
    const token = await submitDraft();
    if (token) router.push("/patient/complete");
  }

  const sections: [string, string][] = [
    ["Personal Information", draft.name === "Guest Patient" ? "Guest patient" : `${draft.name}, ${draft.age} yrs, ${draft.gender}`],
    ["Chief Complaint", draft.chiefComplaintLabel],
    ...flow
      .filter((f) => draft.answers[f.id] !== undefined)
      .map((f): [string, string] => [
        f.technicalTerm ? `${f.question.split("?")[0]} (${f.technicalTerm})` : f.question.split("?")[0],
        Array.isArray(draft.answers[f.id]) ? (draft.answers[f.id] as string[]).join(", ") : String(draft.answers[f.id]),
      ]),
    ["Uploaded Documents", draft.documents.length ? draft.documents.map((d) => d.documentType).join(", ") : "None uploaded"],
  ];

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-8">
      <FloatingNav />
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="font-serif-display text-2xl font-semibold text-teal-900">Rapha</div>
            <div className="text-xs text-stone-500">AYUSH Case-Taking Assistant</div>
          </div>
          <ProgressSteps steps={STEPS} activeIndex={4} />
        </div>

        <Card className="p-8">
          <h2 className="font-serif-display text-xl font-semibold text-teal-900 mb-1">{t(lang, "reviewTitle")}</h2>
          <p className="text-xs text-stone-500 mb-5">Tap Back on any earlier screen to fix something. This is not a medical severity score — just how complete your case information is.</p>

          <Card className="p-4 mb-6 bg-teal-50 border-teal-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-teal-800">CASE PREPARATION</span>
              <span className="font-serif-display text-xl font-semibold text-teal-900">{prep.percent}% Complete</span>
            </div>
            <div className="h-2 bg-white rounded-full overflow-hidden mb-3">
              <div className="h-full bg-teal-600 rounded-full transition-all" style={{ width: `${prep.percent}%` }} />
            </div>
            <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
              {prep.sections.map((s) => (
                <div key={s.label} className={s.complete ? "text-teal-800" : "text-amber-700"}>
                  {s.complete ? "✓" : "⚠"} {s.label}{!s.complete ? " — incomplete" : ""}
                </div>
              ))}
            </div>
          </Card>

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
