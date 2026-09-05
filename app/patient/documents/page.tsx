"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, Camera, AlertTriangle, Loader2 } from "lucide-react";
import { Card, Badge } from "@/components/shared/Primitives";
import Button from "@/components/shared/Button";
import ProgressSteps from "@/components/shared/ProgressSteps";
import FloatingNav from "@/components/shared/FloatingNav";
import { useMediKioskStore } from "@/lib/data/store";
import { PROCESSING_STAGES } from "@/lib/ai/documentEngine";
import { ProcessingStage } from "@/types/document";

const STEPS = ["Identify", "Consent", "History", "Documents", "Review", "Complete"];
const STAGE_LABEL: Record<string, string> = {
  uploading: "Uploading…",
  ocr: "OCR processing…",
  extracting: "Extracting medical information…",
  organizing: "Organizing timeline…",
};

export default function DocumentsPage() {
  const router = useRouter();
  const hydrated = useMediKioskStore((s) => s.hydrated);
  const draft = useMediKioskStore((s) => s.draft);
  const finishDocProcessing = useMediKioskStore((s) => s.finishDocProcessing);
  const [stage, setStage] = useState<ProcessingStage>(null);

  if (!hydrated) return null;
  if (!draft) {
    router.replace("/patient");
    return null;
  }

  function simulateScan() {
    const stages: ProcessingStage[] = [...PROCESSING_STAGES];
    stages.forEach((s, i) => {
      setTimeout(() => setStage(s), i * 700);
    });
    setTimeout(() => {
      setStage("done");
      finishDocProcessing();
    }, stages.length * 700);
  }

  const doc = draft.documents[0];

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-8">
      <FloatingNav />
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="font-serif-display text-2xl font-semibold text-teal-900">MediKiosk</div>
            <div className="text-xs text-stone-500">Clinical Intake Assistant</div>
          </div>
          <ProgressSteps steps={STEPS} activeIndex={3} />
        </div>

        <Card className="p-8">
          <h2 className="font-serif-display text-xl font-semibold text-teal-900 mb-1">Add Previous Medical Records</h2>
          <p className="text-sm text-stone-500 mb-6">Upload a photo, PDF, or scan — we'll pull out the key details automatically. You can skip if you have nothing to add.</p>

          {!doc && !stage && (
            <div onClick={simulateScan} className="border-2 border-dashed border-stone-300 rounded-2xl p-10 text-center cursor-pointer hover:border-teal-400 hover:bg-teal-50/40 mb-6">
              <Upload size={30} className="mx-auto text-teal-700 mb-3" />
              <div className="font-semibold text-sm text-stone-700 mb-1">Drag & drop, or tap to upload</div>
              <div className="text-xs text-stone-400">PDF, JPG, PNG · or use Take Photo / Scan Document</div>
              <div className="flex justify-center gap-3 mt-4">
                <span className="inline-flex items-center gap-1 text-xs text-teal-700 font-semibold"><Camera size={14} /> Take Photo</span>
                <span className="inline-flex items-center gap-1 text-xs text-teal-700 font-semibold"><FileText size={14} /> Scan Document</span>
              </div>
            </div>
          )}

          {stage && stage !== "done" && (
            <div className="p-8 text-center mb-6">
              <Loader2 size={28} className="mx-auto text-teal-700 animate-spin mb-4" />
              <div className="text-sm font-semibold text-stone-700">{STAGE_LABEL[stage]}</div>
            </div>
          )}

          {doc && (
            <Card className="p-5 mb-6 bg-stone-50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 font-semibold text-sm text-stone-800"><FileText size={16} className="text-teal-700" /> {doc.documentType}</div>
                <Badge tone="emerald">Digitized</Badge>
              </div>
              <div className="text-xs text-stone-400 mb-3">{doc.date}</div>
              <div className="space-y-1.5">
                {doc.fields.map((f) => (
                  <div key={f.key} className="flex justify-between text-sm">
                    <span className="text-stone-500">{f.key}</span>
                    <span className={`font-medium ${f.abnormal ? "text-rose-600" : "text-stone-700"}`}>
                      {f.value}{f.abnormal && <AlertTriangle size={12} className="inline ml-1 mb-0.5" />}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-4 text-xs">
                <button className="text-teal-700 font-semibold">View Original</button>
                <button className="text-teal-700 font-semibold">Edit Extracted Data</button>
                <button className="text-emerald-700 font-semibold">Confirm</button>
              </div>
            </Card>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => router.push("/patient/history")}>Back</Button>
            <Button onClick={() => router.push("/patient/review")} className="flex-1">{doc ? "Continue" : "Skip this step"}</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
