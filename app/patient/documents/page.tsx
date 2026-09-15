"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, Camera, AlertTriangle, Loader2, CheckCircle2, XCircle, Info } from "lucide-react";
import { Card, Badge } from "@/components/shared/Primitives";
import Button from "@/components/shared/Button";
import ProgressSteps from "@/components/shared/ProgressSteps";
import FloatingNav from "@/components/shared/FloatingNav";
import { useRaphaStore } from "@/lib/data/store";
import { DocumentRecord, ExtractedField } from "@/types/document";

const STEPS = ["Identify", "Consent", "History", "Documents", "Review", "Complete"];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function DocumentsPage() {
  const router = useRouter();
  const hydrated = useRaphaStore((s) => s.hydrated);
  const draft = useRaphaStore((s) => s.draft);
  const addDocument = useRaphaStore((s) => s.addDocument);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState<DocumentRecord | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hydrated) return null;
  if (!draft) {
    router.replace("/patient");
    return null;
  }

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const imageBase64 = await fileToBase64(file);
      const res = await fetch("/api/ai/extract-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mimeType: file.type || "image/jpeg", filename: file.name, fallbackCategory: draft!.chiefComplaints[0] }),
      });
      const data = await res.json();
      setPending(data.document);
      setUsedFallback(!!data.usedDemoFallback);
    } catch {
      setError("Couldn't read that file — please try a different photo or PDF, or skip this step.");
    } finally {
      setUploading(false);
    }
  }

  function updateField(index: number, key: keyof ExtractedField, value: string) {
    setPending((p) => (p ? { ...p, fields: p.fields.map((f, i) => (i === index ? { ...f, [key]: value } : f)) } : p));
  }

  async function confirmDocument(edited: boolean) {
    if (!pending) return;
    const final: DocumentRecord = { ...pending, reviewStatus: edited ? "edited" : "confirmed", confirmed: true };
    await addDocument(final);
    setPending(null);
    setUsedFallback(false);
  }

  function rejectDocument() {
    setPending(null);
    setUsedFallback(false);
  }

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-8">
      <FloatingNav />
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="font-serif-display text-2xl font-semibold text-teal-900">Rapha</div>
            <div className="text-xs text-stone-500">AYUSH Case-Taking Assistant</div>
          </div>
          <ProgressSteps steps={STEPS} activeIndex={3} />
        </div>

        <Card className="p-8">
          <h2 className="font-serif-display text-xl font-semibold text-teal-900 mb-1">Add Previous Medical Records</h2>
          <p className="text-sm text-stone-500 mb-6">Upload a photo, PDF, or scan of a prescription, lab report, or discharge summary — we'll pull out the key details for you to check. You can skip if you have nothing to add.</p>

          {!pending && !uploading && (
            <div onClick={() => inputRef.current?.click()} className="border-2 border-dashed border-stone-300 rounded-2xl p-10 text-center cursor-pointer hover:border-teal-400 hover:bg-teal-50/40 mb-6">
              <input
                ref={inputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <Upload size={30} className="mx-auto text-teal-700 mb-3" />
              <div className="font-semibold text-sm text-stone-700 mb-1">Drag & drop, or tap to upload</div>
              <div className="text-xs text-stone-400">PDF, JPG, PNG · or use Take Photo / Scan Document</div>
              <div className="flex justify-center gap-3 mt-4">
                <span className="inline-flex items-center gap-1 text-xs text-teal-700 font-semibold"><Camera size={14} /> Take Photo</span>
                <span className="inline-flex items-center gap-1 text-xs text-teal-700 font-semibold"><FileText size={14} /> Scan Document</span>
              </div>
            </div>
          )}

          {error && <div className="mb-6 text-sm text-rose-600">{error}</div>}

          {uploading && (
            <div className="p-8 text-center mb-6">
              <Loader2 size={28} className="mx-auto text-teal-700 animate-spin mb-4" />
              <div className="text-sm font-semibold text-stone-700">Reading your document…</div>
            </div>
          )}

          {pending && (
            <Card className="p-5 mb-6 bg-stone-50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 font-semibold text-sm text-stone-800"><FileText size={16} className="text-teal-700" /> {pending.documentType}</div>
                <Badge tone="amber">Review Extracted Information</Badge>
              </div>
              {usedFallback && (
                <div className="flex items-start gap-1.5 text-xs text-stone-500 bg-white border border-stone-200 rounded-lg px-3 py-2 mb-3">
                  <Info size={13} className="mt-0.5 shrink-0" /> AI extraction wasn't available, so this is demo/simulated data — please edit it to match your real document, or skip.
                </div>
              )}
              <div className="text-xs text-stone-400 mb-3">{pending.date}{pending.facility ? ` · ${pending.facility}` : ""}</div>
              <div className="space-y-2 mb-4">
                {pending.fields.length === 0 && <div className="text-xs text-stone-400 italic">No fields could be read from this document.</div>}
                {pending.fields.map((f, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2">
                    <input value={f.key} onChange={(e) => updateField(i, "key", e.target.value)} className="px-2.5 py-2 rounded-lg border border-stone-200 text-xs font-medium bg-white" />
                    <div className="relative">
                      <input value={f.value} onChange={(e) => updateField(i, "value", e.target.value)} className={`w-full px-2.5 py-2 rounded-lg border text-xs bg-white ${f.flagForReview ? "border-amber-300" : "border-stone-200"}`} />
                      {f.flagForReview && <AlertTriangle size={12} className="absolute right-2 top-2.5 text-amber-600" />}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button className="text-xs px-3 py-2" icon={CheckCircle2} onClick={() => confirmDocument(false)}>Confirm — this is correct</Button>
                <Button variant="secondary" className="text-xs px-3 py-2" onClick={() => confirmDocument(true)}>Save my edits</Button>
                <Button variant="ghost" className="text-xs px-3 py-2" icon={XCircle} onClick={rejectDocument}>Reject / discard</Button>
              </div>
            </Card>
          )}

          {!pending && draft.documents.length > 0 && (
            <div className="space-y-3 mb-6">
              {draft.documents.map((doc) => (
                <Card key={doc.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium text-stone-700"><FileText size={15} className="text-teal-700" /> {doc.documentType} — {doc.filename}</div>
                  <Badge tone="emerald">{doc.reviewStatus === "edited" ? "Edited & confirmed" : "Confirmed"}</Badge>
                </Card>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => router.push("/patient/history")}>Back</Button>
            <Button onClick={() => router.push("/patient/review")} className="flex-1">{draft.documents.length ? "Continue" : "Skip this step"}</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
