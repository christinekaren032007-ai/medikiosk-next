"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, FileText, Edit3, Check, CheckCircle2, RotateCcw, ShieldCheck, Code2 } from "lucide-react";
import { Card, Badge } from "@/components/shared/Primitives";
import Button from "@/components/shared/Button";
import FloatingNav from "@/components/shared/FloatingNav";
import { useMediKioskStore } from "@/lib/data/store";
import { toFhirBundle } from "@/lib/fhir/transformer";
import { PatientRecord } from "@/types/patient";

const TABS = ["overview", "history", "documents", "timeline", "summary", "consent"] as const;
type Tab = (typeof TABS)[number];

export default function PatientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const confirmSummary = useMediKioskStore((s) => s.confirmSummary);
  const regenerateSummary = useMediKioskStore((s) => s.regenerateSummary);
  const [tab, setTab] = useState<Tab>("overview");
  const [showFhir, setShowFhir] = useState(false);
  const [p, setP] = useState<PatientRecord | null>(null);
  const [notFound, setNotFound] = useState(false);

  async function loadPatient() {
    const res = await fetch(`/api/patients/${id}`);
    if (res.status === 404) {
      setNotFound(true);
      return;
    }
    const data = await res.json();
    setP(data.patient);
  }

  useEffect(() => {
    if (id) loadPatient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleConfirm() {
    if (!p) return;
    await confirmSummary(p.id);
    loadPatient();
  }
  async function handleRegenerate() {
    if (!p) return;
    await regenerateSummary(p.id);
    loadPatient();
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-stone-50 p-8">
        <FloatingNav />
        <div className="text-sm text-stone-400">Patient not found. <button onClick={() => router.push("/doctor")} className="text-teal-700 underline">Back to queue</button></div>
      </div>
    );
  }
  if (!p) return null;

  return (
    <div className="min-h-screen bg-stone-50 p-6 lg:p-8">
      <FloatingNav />
      <button onClick={() => router.push("/doctor")} className="text-xs text-stone-400 mb-4 flex items-center gap-1"><ChevronLeft size={14} /> Back to queue</button>

      <div className="flex items-center gap-4 mb-5">
        <div className="w-12 h-12 rounded-full bg-teal-700 text-white flex items-center justify-center font-semibold">{p.name?.[0]}</div>
        <div>
          <div className="font-semibold text-lg text-stone-800">{p.name} <span className="text-stone-400 font-normal text-sm">· {p.age} yrs · {p.gender}</span></div>
          <div className="text-xs text-stone-400">Token {p.token} {p.priority === "high" && <Badge tone="rose">🔴 Priority</Badge>}</div>
        </div>
      </div>

      <div className="flex gap-1 mb-5 border-b border-stone-200 overflow-x-auto">
        {TABS.map((tb) => (
          <button key={tb} onClick={() => setTab(tb)} className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px whitespace-nowrap ${tab === tb ? "border-teal-700 text-teal-800" : "border-transparent text-stone-400"}`}>
            {tb}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <Card className="p-5">
          <div className="grid sm:grid-cols-2 gap-4 text-sm mb-4">
            <div><div className="text-xs text-stone-400">ABHA</div><div className="font-medium">{p.abhaId || "Guest"}</div></div>
            <div><div className="text-xs text-stone-400">Chief Complaint</div><div className="font-medium">{p.history.chiefComplaintLabel}</div></div>
            <div><div className="text-xs text-stone-400">AI Status</div><Badge tone="emerald">{p.aiStatus === "ready" ? "Ready" : "Processing"}</Badge></div>
            <div><div className="text-xs text-stone-400">Consent</div><div className="font-medium">{p.consent.granted ? `Granted at ${p.consent.timestamp}` : "Not granted"}</div></div>
          </div>
          <Button variant="secondary" icon={Code2} onClick={() => setShowFhir(true)}>View FHIR Bundle</Button>
        </Card>
      )}

      {tab === "history" && (
        <Card className="p-5 space-y-4">
          {[
            ["Chief Complaint", p.summary.chiefComplaint],
            ["History of Present Illness", p.summary.hpi],
            ["Past Medical History", p.summary.pastHistory],
            ["Medications", p.summary.medications],
            ["Allergies", p.summary.allergies],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between items-start border-b border-stone-50 pb-3">
              <div className="max-w-md"><div className="text-xs text-stone-400 mb-0.5">{k}</div><div className="text-sm">{v}</div></div>
              <div className="flex gap-2 text-xs text-stone-400"><Edit3 size={13} className="cursor-pointer" /><Check size={13} className="cursor-pointer text-emerald-600" /></div>
            </div>
          ))}
        </Card>
      )}

      {tab === "documents" && (
        <Card className="p-5">
          {p.documents.length === 0 && <div className="text-sm text-stone-400">No documents uploaded.</div>}
          {p.documents.map((doc) => (
            <div key={doc.id} className="grid sm:grid-cols-2 gap-5">
              <div className="border border-stone-200 rounded-xl p-4 bg-stone-50 text-center text-xs text-stone-400 h-40 flex items-center justify-center">Original document preview<br />({doc.filename})</div>
              <div>
                <div className="font-semibold text-sm mb-2 flex items-center gap-2"><FileText size={14} className="text-teal-700" /> {doc.documentType} — {doc.date}</div>
                {doc.fields.map((f) => (
                  <div key={f.key} className="flex justify-between text-sm py-1 border-b border-stone-50">
                    <span className="text-stone-500">{f.key}</span>
                    <span className={f.abnormal ? "text-rose-600 font-medium" : "font-medium"}>{f.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Card>
      )}

      {tab === "timeline" && (
        <Card className="p-5">
          <div className="space-y-4">
            {p.timeline.map((ev) => (
              <div key={ev.id} className="flex gap-3 items-start">
                <div className="w-16 text-xs font-semibold text-teal-700 pt-0.5">{ev.year}</div>
                <div className="w-2 h-2 rounded-full bg-teal-600 mt-1.5" />
                <div className="text-sm text-stone-700">{ev.label}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "summary" && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <Badge tone="amber">AI-GENERATED DRAFT — Requires Healthcare Professional Review</Badge>
            {p.doctorReview.confirmed && <Badge tone="emerald">Summary verified by physician</Badge>}
          </div>
          <div className="space-y-3 text-sm mb-5">
            <div><span className="font-semibold">Chief Complaint: </span>{p.summary.chiefComplaint}</div>
            <div><span className="font-semibold">History of Present Illness: </span>{p.summary.hpi}</div>
            <div><span className="font-semibold">Past Medical History: </span>{p.summary.pastHistory}</div>
            <div><span className="font-semibold">Current Medications: </span>{p.summary.medications}</div>
            <div><span className="font-semibold">Allergies: </span>{p.summary.allergies}</div>
            <div><span className="font-semibold">Previous Investigations: </span>{p.summary.investigations}</div>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleConfirm} icon={CheckCircle2}>Confirm Summary</Button>
            <Button variant="secondary" icon={RotateCcw} onClick={handleRegenerate}>Regenerate</Button>
          </div>
        </Card>
      )}

      {tab === "consent" && (
        <Card className="p-5 text-sm">
          <div className="flex items-center gap-2 mb-3"><ShieldCheck size={16} className="text-emerald-600" /> Consent granted at {p.consent.timestamp}</div>
          <div className="text-xs text-stone-400">Patient agreed to history collection and document digitization for the purpose of preparing this consultation. Consent text version: {p.consent.consentTextVersion}.</div>
        </Card>
      )}

      {showFhir && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowFhir(false)}>
          <Card className="p-5 max-w-2xl w-full max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <Badge tone="amber">DEMO / SIMULATED — not a real ABDM submission</Badge>
              <button onClick={() => setShowFhir(false)} className="text-stone-400 text-sm">Close</button>
            </div>
            <pre className="text-xs bg-stone-900 text-emerald-300 p-4 rounded-xl overflow-auto">{JSON.stringify(toFhirBundle(p), null, 2)}</pre>
          </Card>
        </div>
      )}
    </div>
  );
}
