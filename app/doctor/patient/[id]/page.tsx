"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, FileText, Edit3, Check, CheckCircle2, RotateCcw, ShieldCheck, Code2, Plus, Trash2, ClipboardPlus, PenLine, AlertTriangle, HelpCircle, MessageCircleQuestion, X, ThumbsUp, Meh, ThumbsDown, Leaf } from "lucide-react";
import { Card, Badge } from "@/components/shared/Primitives";
import Button from "@/components/shared/Button";
import FloatingNav from "@/components/shared/FloatingNav";
import HandwritingCanvas from "@/components/doctor/HandwritingCanvas";
import { useRaphaStore } from "@/lib/data/store";
import { toFhirBundle } from "@/lib/fhir/transformer";
import { computeCasePreparation } from "@/lib/ai/casePreparation";
import { computeClarifications } from "@/lib/ai/clarifications";
import { PatientRecord } from "@/types/patient";
import { Medicine, TreatmentResponseStatus } from "@/types/ai";

const TABS = ["overview", "case", "documents", "timeline", "followups", "consultation", "consent"] as const;
type Tab = (typeof TABS)[number];

const EMPTY_MEDICINE: Medicine = { name: "", dosage: "", frequency: "", duration: "" };

export default function PatientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const confirmCaseSheet = useRaphaStore((s) => s.confirmCaseSheet);
  const regenerateCaseSheet = useRaphaStore((s) => s.regenerateCaseSheet);
  const saveConsultation = useRaphaStore((s) => s.saveConsultation);
  const addTreatmentFollowup = useRaphaStore((s) => s.addTreatmentFollowup);
  const [tab, setTab] = useState<Tab>("overview");
  const [showFhir, setShowFhir] = useState(false);
  const [p, setP] = useState<PatientRecord | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [clarificationStatus, setClarificationStatus] = useState<Record<string, "asked" | "ignored">>({});
  const [showReasonFor, setShowReasonFor] = useState<number | null>(null);

  const [diagnosis, setDiagnosis] = useState("");
  const [medicines, setMedicines] = useState<Medicine[]>([{ ...EMPTY_MEDICINE }]);
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [doctorNotes, setDoctorNotes] = useState("");
  const [savingConsultation, setSavingConsultation] = useState(false);
  const [consultationSaved, setConsultationSaved] = useState(false);

  const [showRxCanvas, setShowRxCanvas] = useState(false);
  const [rxTranscription, setRxTranscription] = useState<string | null>(null);
  const [rxUncertain, setRxUncertain] = useState(false);
  const [rxFailed, setRxFailed] = useState(false);
  const [rxParsing, setRxParsing] = useState(false);
  const [rxParseOutcome, setRxParseOutcome] = useState<"added" | "no-medicines-found" | null>(null);

  const [showNotesCanvas, setShowNotesCanvas] = useState(false);
  const [notesTranscription, setNotesTranscription] = useState<string | null>(null);
  const [notesUncertain, setNotesUncertain] = useState(false);
  const [notesFailed, setNotesFailed] = useState(false);

  const [fuStatus, setFuStatus] = useState<TreatmentResponseStatus>("same");
  const [fuSeverity, setFuSeverity] = useState(5);
  const [fuNewSymptoms, setFuNewSymptoms] = useState("");
  const [fuAdherence, setFuAdherence] = useState("");
  const [fuSideEffects, setFuSideEffects] = useState("");
  const [savingFollowup, setSavingFollowup] = useState(false);

  async function loadPatient() {
    const res = await fetch(`/api/patients/${id}`);
    if (res.status === 404) {
      setNotFound(true);
      return;
    }
    const data = await res.json();
    const patient: PatientRecord = data.patient;
    setP(patient);
    if (patient.consultation) {
      setDiagnosis(patient.consultation.diagnosis);
      setMedicines(patient.consultation.medicines.length ? patient.consultation.medicines : [{ ...EMPTY_MEDICINE }]);
      setAdditionalInstructions(patient.consultation.additionalInstructions);
      setDoctorNotes(patient.consultation.doctorNotes);
    }
  }

  useEffect(() => {
    if (id) loadPatient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const casePrep = useMemo(() => (p ? computeCasePreparation(p.history, p.documents) : null), [p]);
  const clarifications = useMemo(() => (p ? computeClarifications(p.history, p.documents) : []), [p]);

  function updateMedicine(index: number, field: keyof Medicine, value: string) {
    setMedicines((meds) => meds.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  }
  function addMedicine() {
    setMedicines((meds) => [...meds, { ...EMPTY_MEDICINE }]);
  }
  function removeMedicine(index: number) {
    setMedicines((meds) => (meds.length > 1 ? meds.filter((_, i) => i !== index) : meds));
  }

  async function confirmRxTranscription() {
    if (!rxTranscription?.trim()) return;
    const confirmedText = rxTranscription.trim();
    setRxParsing(true);
    setRxParseOutcome(null);
    let parsed: Medicine[] | null = null;
    try {
      const res = await fetch("/api/ai/parse-prescription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: confirmedText }),
      });
      const data = await res.json();
      parsed = data.medicines;
    } catch {
      parsed = null;
    }
    if (parsed?.length) {
      setMedicines((meds) => {
        const withoutEmpty = meds.filter((m) => m.name.trim() !== "");
        return [...withoutEmpty, ...parsed!];
      });
      setRxParseOutcome("added");
    } else {
      setAdditionalInstructions((prev) => (prev.trim() ? `${prev}\n${confirmedText}` : confirmedText));
      setRxParseOutcome("no-medicines-found");
    }
    setRxParsing(false);
    setRxTranscription(null);
    setRxUncertain(false);
    setShowRxCanvas(false);
  }

  function confirmNotesTranscription() {
    if (!notesTranscription?.trim()) return;
    setDoctorNotes((prev) => (prev.trim() ? `${prev}\n${notesTranscription.trim()}` : notesTranscription.trim()));
    setNotesTranscription(null);
    setNotesUncertain(false);
    setShowNotesCanvas(false);
  }

  async function handleCompleteConsultation() {
    if (!p) return;
    setSavingConsultation(true);
    setConsultationSaved(false);
    await saveConsultation(p.id, {
      diagnosis,
      medicines: medicines.filter((m) => m.name.trim() !== ""),
      additionalInstructions,
      doctorNotes,
    });
    setSavingConsultation(false);
    setConsultationSaved(true);
    await loadPatient();
  }

  async function handleConfirm() {
    if (!p) return;
    await confirmCaseSheet(p.id);
    loadPatient();
  }
  async function handleRegenerate() {
    if (!p) return;
    await regenerateCaseSheet(p.id);
    loadPatient();
  }

  async function submitFollowup() {
    if (!p) return;
    setSavingFollowup(true);
    await addTreatmentFollowup(p.id, {
      status: fuStatus,
      severity: fuSeverity,
      newSymptoms: fuNewSymptoms || undefined,
      adherence: fuAdherence || undefined,
      sideEffects: fuSideEffects || undefined,
    });
    setSavingFollowup(false);
    setFuNewSymptoms("");
    setFuAdherence("");
    setFuSideEffects("");
    await loadPatient();
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-stone-50 p-8">
        <FloatingNav />
        <div className="text-sm text-stone-400">Patient not found. <button onClick={() => router.push("/doctor")} className="text-teal-700 underline">Back to case list</button></div>
      </div>
    );
  }
  if (!p || !casePrep) return null;

  return (
    <div className="min-h-screen bg-stone-50 p-6 lg:p-8">
      <FloatingNav />
      <button onClick={() => router.push("/doctor")} className="text-xs text-stone-400 mb-4 flex items-center gap-1"><ChevronLeft size={14} /> Back to case list</button>

      <div className="flex items-center gap-4 mb-5 flex-wrap">
        <div className="w-12 h-12 rounded-full bg-teal-700 text-white flex items-center justify-center font-semibold">{p.name?.[0]}</div>
        <div>
          <div className="font-semibold text-lg text-stone-800">{p.name} <span className="text-stone-400 font-normal text-sm">· {p.age} yrs · {p.gender}</span></div>
          <div className="text-xs text-stone-400">Token {p.token}</div>
        </div>
        <div className="ml-auto flex items-center gap-2 bg-white border border-stone-200 rounded-xl px-3 py-2">
          <div className="h-1.5 w-24 bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full bg-teal-600 rounded-full" style={{ width: `${casePrep.percent}%` }} />
          </div>
          <span className="text-xs font-semibold text-teal-800">{casePrep.percent}% Case Prep</span>
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
        <div className="space-y-4">
          <Card className="p-5">
            <div className="grid sm:grid-cols-2 gap-4 text-sm mb-4">
              <div><div className="text-xs text-stone-400">ABHA</div><div className="font-medium">{p.abhaId || "Guest"}</div></div>
              <div><div className="text-xs text-stone-400">Chief Complaint</div><div className="font-medium">{p.history.chiefComplaintLabel}</div></div>
              <div><div className="text-xs text-stone-400">AI Status</div><Badge tone="emerald">{p.aiStatus === "ready" ? "Ready" : "Processing"}</Badge></div>
              <div><div className="text-xs text-stone-400">Consent</div><div className="font-medium">{p.consent.granted ? `Granted at ${p.consent.timestamp}` : "Not granted"}</div></div>
            </div>
            <Button variant="secondary" icon={Code2} onClick={() => setShowFhir(true)}>View FHIR Bundle</Button>
          </Card>

          <Card className="p-5">
            <div className="text-xs font-semibold text-stone-500 mb-3">CASE PREPARATION — not a medical severity score</div>
            <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              {casePrep.sections.map((s) => (
                <div key={s.label} className={s.complete ? "text-teal-800" : "text-amber-700"}>
                  {s.complete ? "✓" : "⚠"} {s.label}{!s.complete ? " — incomplete" : ""}
                </div>
              ))}
            </div>
          </Card>

          {clarifications.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 mb-3"><HelpCircle size={14} /> MAY NEED CLARIFICATION</div>
              <div className="space-y-2">
                {clarifications.map((c) => {
                  const status = clarificationStatus[c.id];
                  return (
                    <div key={c.id} className="flex items-start justify-between gap-3 text-sm border-b border-stone-50 pb-2">
                      <div className={status ? "text-stone-400 line-through" : "text-stone-700"}>
                        <Badge tone="stone">{c.section}</Badge> <span className="ml-1">{c.label}</span>
                      </div>
                      {!status && (
                        <div className="flex gap-2 text-xs shrink-0">
                          <button onClick={() => setClarificationStatus((s) => ({ ...s, [c.id]: "asked" }))} className="text-teal-700 font-semibold flex items-center gap-1"><MessageCircleQuestion size={13} /> Ask Patient</button>
                          <button onClick={() => setClarificationStatus((s) => ({ ...s, [c.id]: "ignored" }))} className="text-stone-400 font-semibold flex items-center gap-1"><X size={13} /> Ignore</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === "case" && (
        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Badge tone="amber">AI-organized draft — requires practitioner review</Badge>
              {p.doctorReview.confirmed && <Badge tone="emerald">Case sheet verified by practitioner</Badge>}
            </div>
            {[
              ["Chief Complaint", p.caseSheet.chiefComplaint],
              ["History of Present Illness", p.caseSheet.hpi],
              ["Relevant Medical History", p.caseSheet.medicalHistory],
              ["Current Medications", p.caseSheet.currentMedications],
              ["Allergies", p.caseSheet.allergies],
              ["Previous Treatment", p.caseSheet.previousTreatment],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between items-start border-b border-stone-50 pb-3">
                <div className="max-w-md"><div className="text-xs text-stone-400 mb-0.5">{k}</div><div className="text-sm">{v}</div></div>
                <div className="flex gap-2 text-xs text-stone-400"><Edit3 size={13} className="cursor-pointer" /><Check size={13} className="cursor-pointer text-emerald-600" /></div>
              </div>
            ))}

            <div className="flex gap-3">
              <Button onClick={handleConfirm} icon={CheckCircle2}>Confirm Case Sheet</Button>
              <Button variant="secondary" icon={RotateCcw} onClick={handleRegenerate}>Regenerate</Button>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-teal-700 mb-4"><Leaf size={14} /> AYUSH CASE INFORMATION</div>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div><div className="text-xs text-stone-400">Prakriti</div><div className="font-medium">{p.caseSheet.ayush.prakriti}</div></div>
              <div><div className="text-xs text-stone-400">Vikriti</div><div className="font-medium">{p.caseSheet.ayush.vikriti}</div></div>
              <div><div className="text-xs text-stone-400">Agni</div><div className="font-medium">{p.caseSheet.ayush.agni}</div></div>
              <div><div className="text-xs text-stone-400">Kostha</div><div className="font-medium">{p.caseSheet.ayush.kostha}</div></div>
              <div className="sm:col-span-2"><div className="text-xs text-stone-400">Ahara-Vihara</div><div className="font-medium">{p.caseSheet.ayush.aharaVihara}</div></div>
              <div className="sm:col-span-2"><div className="text-xs text-stone-400">Nidana (triggers)</div><div className="font-medium">{p.caseSheet.ayush.nidana}</div></div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="text-xs text-stone-400 mb-1.5">Family Medical History</div>
            {p.history.noFamilyHistory && <div className="text-sm text-stone-600">No known family medical history.</div>}
            {!p.history.noFamilyHistory && (!p.history.familyHistory || p.history.familyHistory.length === 0) && (
              <div className="text-sm text-stone-400 italic">Not reported.</div>
            )}
            {!!p.history.familyHistory?.length && (
              <div className="flex flex-wrap gap-2">
                {p.history.familyHistory.map((f, i) => (
                  <Badge key={i} tone="stone">
                    {f.condition}
                    {f.relation ? ` (${f.relation})` : ""}
                    {f.details ? ` — ${f.details}` : ""}
                  </Badge>
                ))}
              </div>
            )}
          </Card>

          {!!p.history.aiFollowUp?.length && (
            <Card className="p-5">
              <div className="text-xs font-semibold text-stone-500 mb-3">AI FOLLOW-UP QUESTIONS</div>
              <div className="space-y-3">
                {p.history.aiFollowUp.map((qa, i) => (
                  <div key={i} className="text-sm border-b border-stone-50 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-stone-500">{qa.question}</div>
                        <div className="font-medium">{qa.answer}</div>
                      </div>
                      {qa.reason && (
                        <button onClick={() => setShowReasonFor(showReasonFor === i ? null : i)} className="text-xs text-teal-700 shrink-0 flex items-center gap-1">
                          <HelpCircle size={12} /> Why?
                        </button>
                      )}
                    </div>
                    {showReasonFor === i && qa.reason && (
                      <div className="mt-1.5 text-xs text-stone-500 bg-stone-50 rounded-lg p-2">{qa.reason}</div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {p.caseSheet.aiGenerated && p.caseSheet.aiNarrative && (
            <Card className="p-5 bg-teal-50 border-teal-100">
              <Badge tone="teal">AI-organized case note based on patient-provided information. Not a diagnosis.</Badge>
              <p className="text-sm text-stone-700 mt-3 whitespace-pre-wrap">{p.caseSheet.aiNarrative}</p>
            </Card>
          )}
        </div>
      )}

      {tab === "documents" && (
        <Card className="p-5">
          {p.documents.length === 0 && <div className="text-sm text-stone-400">No documents uploaded.</div>}
          <div className="space-y-5">
            {p.documents.map((doc) => (
              <div key={doc.id} className="grid sm:grid-cols-2 gap-5">
                <div className="border border-stone-200 rounded-xl p-4 bg-stone-50 text-center text-xs text-stone-400 h-40 flex items-center justify-center">Original document preview<br />({doc.filename})</div>
                <div>
                  <div className="font-semibold text-sm mb-1 flex items-center gap-2"><FileText size={14} className="text-teal-700" /> {doc.documentType} — {doc.date}</div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge tone={doc.aiExtracted ? "teal" : "stone"}>{doc.aiExtracted ? "AI-extracted" : "Demo data"}</Badge>
                    <Badge tone={doc.reviewStatus === "unreviewed" ? "amber" : "emerald"}>{doc.reviewStatus}</Badge>
                  </div>
                  {doc.fields.map((f) => (
                    <div key={f.key} className="flex justify-between text-sm py-1 border-b border-stone-50">
                      <span className="text-stone-500">{f.key}</span>
                      <span className={f.flagForReview ? "text-amber-700 font-medium" : "font-medium"}>{f.value}{f.flagForReview && <AlertTriangle size={12} className="inline ml-1 mb-0.5" />}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "timeline" && (
        <Card className="p-5">
          <div className="space-y-4">
            {p.timeline.map((ev) => (
              <div key={ev.id} className="flex gap-3 items-start">
                <div className="w-24 text-xs font-semibold text-teal-700 pt-0.5">{ev.year}</div>
                <div className="w-2 h-2 rounded-full bg-teal-600 mt-1.5" />
                <div className="text-sm text-stone-700">{ev.label}</div>
              </div>
            ))}
            {p.timeline.length === 0 && <div className="text-sm text-stone-400">No timeline events yet.</div>}
          </div>
        </Card>
      )}

      {tab === "followups" && (
        <div className="space-y-4">
          <Card className="p-5">
            <div className="text-xs font-semibold text-stone-500 mb-3">TREATMENT RESPONSE — patient-reported only</div>
            {(!p.treatmentFollowups || p.treatmentFollowups.length === 0) && <div className="text-sm text-stone-400 italic mb-4">No follow-up visits recorded yet.</div>}
            <div className="space-y-3 mb-5">
              {p.treatmentFollowups?.map((f) => (
                <div key={f.id} className="flex items-start gap-3 border-b border-stone-50 pb-3 text-sm">
                  <div className="shrink-0 mt-0.5">
                    {f.status === "better" && <ThumbsUp size={16} className="text-emerald-600" />}
                    {f.status === "same" && <Meh size={16} className="text-amber-600" />}
                    {f.status === "worse" && <ThumbsDown size={16} className="text-rose-600" />}
                  </div>
                  <div>
                    <div className="font-medium capitalize">{f.status}{f.severity !== undefined ? ` · severity ${f.severity}/10` : ""}</div>
                    <div className="text-xs text-stone-400">{new Date(f.date).toLocaleString()}</div>
                    {f.newSymptoms && <div className="text-xs text-stone-600 mt-1">New symptoms: {f.newSymptoms}</div>}
                    {f.adherence && <div className="text-xs text-stone-600">Adherence: {f.adherence}</div>}
                    {f.sideEffects && <div className="text-xs text-stone-600">Side effects: {f.sideEffects}</div>}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-xs font-semibold text-stone-500 mb-2">Record a return-visit check-in</div>
            <div className="flex gap-2 mb-3">
              {(["better", "same", "worse"] as TreatmentResponseStatus[]).map((s) => (
                <button key={s} onClick={() => setFuStatus(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border capitalize ${fuStatus === s ? "border-teal-700 bg-teal-50 text-teal-800" : "border-stone-200 text-stone-600"}`}>{s}</button>
              ))}
            </div>
            <div className="mb-3">
              <label className="text-xs text-stone-500 block mb-1">Symptom severity (patient-reported)</label>
              <input type="range" min={0} max={10} value={fuSeverity} onChange={(e) => setFuSeverity(Number(e.target.value))} className="w-full max-w-xs" />
              <span className="text-xs text-stone-500">{fuSeverity}/10</span>
            </div>
            <div className="grid sm:grid-cols-3 gap-2 mb-3">
              <input value={fuNewSymptoms} onChange={(e) => setFuNewSymptoms(e.target.value)} placeholder="New symptoms (optional)" className="px-3 py-2 rounded-lg border border-stone-200 text-sm" />
              <input value={fuAdherence} onChange={(e) => setFuAdherence(e.target.value)} placeholder="Treatment adherence (optional)" className="px-3 py-2 rounded-lg border border-stone-200 text-sm" />
              <input value={fuSideEffects} onChange={(e) => setFuSideEffects(e.target.value)} placeholder="Side effects (optional)" className="px-3 py-2 rounded-lg border border-stone-200 text-sm" />
            </div>
            <Button onClick={submitFollowup} disabled={savingFollowup} className="text-sm">{savingFollowup ? "Saving…" : "Save Follow-up"}</Button>
          </Card>

          <Card className="p-5">
            <div className="text-xs font-semibold text-stone-500 mb-3">AHARA-VIHARA — LIFESTYLE PATTERN</div>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              {[
                ["Diet", p.history.answers.foodHabits],
                ["Meal timing", p.history.answers.mealTiming],
                ["Water intake", p.history.answers.waterIntake],
                ["Sleep", p.history.answers.sleepPattern],
                ["Physical activity", p.history.answers.physicalActivity],
                ["Daily routine", p.history.answers.dailyRoutine],
                ["Yoga / meditation", p.history.answers.yogaMeditation],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between border-b border-stone-50 pb-1.5">
                  <span className="text-stone-500">{k}</span>
                  <span className="font-medium">{(v as string) || "—"}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === "consultation" && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="font-semibold text-stone-800">Clinical Assessment &amp; Prescription</div>
            {p.consultation && <Badge tone="emerald">Consultation completed at {new Date(p.consultation.completedAt).toLocaleString()}</Badge>}
          </div>

          <div className="mb-5">
            <label className="text-xs font-semibold text-stone-500 mb-1.5 block">Diagnosis (practitioner-entered)</label>
            <textarea
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              rows={2}
              placeholder="Practitioner's diagnosis…"
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-teal-400"
            />
          </div>

          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-stone-500">Prescribed Medicines (practitioner-entered)</label>
              <button onClick={addMedicine} className="text-xs text-teal-700 font-semibold flex items-center gap-1"><Plus size={13} /> Add medicine</button>
            </div>
            <div className="space-y-2">
              {medicines.map((med, i) => (
                <div key={i} className="grid sm:grid-cols-[1.3fr_1fr_1fr_1fr_auto] gap-2 items-center">
                  <input value={med.name} onChange={(e) => updateMedicine(i, "name", e.target.value)} placeholder="Medicine" className="px-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:border-teal-400" />
                  <input value={med.dosage} onChange={(e) => updateMedicine(i, "dosage", e.target.value)} placeholder="Dosage" className="px-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:border-teal-400" />
                  <input value={med.frequency} onChange={(e) => updateMedicine(i, "frequency", e.target.value)} placeholder="Frequency" className="px-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:border-teal-400" />
                  <input value={med.duration} onChange={(e) => updateMedicine(i, "duration", e.target.value)} placeholder="Duration" className="px-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:border-teal-400" />
                  <button onClick={() => removeMedicine(i)} className="text-stone-400 hover:text-rose-600 justify-self-center"><Trash2 size={15} /></button>
                </div>
              ))}
            </div>

            {rxParseOutcome === "added" && (
              <div className="text-xs text-emerald-600 font-medium mt-2">Medicine(s) added from your handwriting below — please review before saving.</div>
            )}
            {rxParseOutcome === "no-medicines-found" && (
              <div className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                Couldn't identify structured medicines (name/dosage/frequency/duration) from that text — your confirmed text was added to "Additional Instructions" below instead so nothing is lost. You can copy it into the medicine fields manually.
              </div>
            )}

            <div className="mt-3">
              {!showRxCanvas ? (
                <button onClick={() => setShowRxCanvas(true)} className="text-xs text-teal-700 font-semibold flex items-center gap-1">
                  <PenLine size={13} /> Write prescription by hand instead
                </button>
              ) : (
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <HandwritingCanvas
                    onResult={(text, uncertain) => {
                      setRxTranscription(text);
                      setRxUncertain(uncertain);
                      setRxFailed(text === null);
                    }}
                  />
                  {rxFailed && (
                    <div className="flex items-center gap-1.5 text-xs text-rose-600 mt-3">
                      <AlertTriangle size={13} /> Couldn't read the handwriting — please try writing more clearly, or type it in manually below.
                    </div>
                  )}
                  {rxTranscription !== null && (
                    <div className="mt-3">
                      <Badge tone="amber">AI-transcribed text — Please verify</Badge>
                      {rxUncertain && (
                        <div className="flex items-center gap-1.5 text-xs text-rose-600 mt-1.5">
                          <AlertTriangle size={13} /> Some parts were unclear and are marked with [[double brackets]] — please correct them.
                        </div>
                      )}
                      <textarea
                        value={rxTranscription}
                        onChange={(e) => setRxTranscription(e.target.value)}
                        rows={3}
                        className="w-full mt-2 px-3 py-2 rounded-lg border border-amber-300 bg-amber-50 text-sm focus:outline-none focus:border-amber-400"
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={confirmRxTranscription}
                          disabled={rxParsing}
                          className="text-xs bg-teal-700 text-white font-semibold px-3 py-1.5 rounded-lg disabled:opacity-40"
                        >
                          {rxParsing ? "Adding…" : "Confirm & Add to Prescription"}
                        </button>
                        <button
                          onClick={() => { setRxTranscription(null); setRxUncertain(false); setRxFailed(false); }}
                          className="text-xs text-stone-500 font-medium px-3 py-1.5"
                        >
                          Discard
                        </button>
                      </div>
                    </div>
                  )}
                  <button onClick={() => { setShowRxCanvas(false); setRxTranscription(null); setRxFailed(false); }} className="text-xs text-stone-400 mt-3 block">
                    Close handwriting input
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mb-5">
            <label className="text-xs font-semibold text-stone-500 mb-1.5 block">Additional Instructions</label>
            <textarea
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
              rows={2}
              placeholder="e.g. Take with food, follow up in 1 week…"
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-teal-400"
            />
          </div>

          <div className="mb-6">
            <label className="text-xs font-semibold text-stone-500 mb-1.5 block">Practitioner's Notes</label>
            <textarea
              value={doctorNotes}
              onChange={(e) => setDoctorNotes(e.target.value)}
              rows={2}
              placeholder="Private notes for the record…"
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-teal-400"
            />

            <div className="mt-3">
              {!showNotesCanvas ? (
                <button onClick={() => setShowNotesCanvas(true)} className="text-xs text-teal-700 font-semibold flex items-center gap-1">
                  <PenLine size={13} /> Write notes by hand instead
                </button>
              ) : (
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <HandwritingCanvas
                    onResult={(text, uncertain) => {
                      setNotesTranscription(text);
                      setNotesUncertain(uncertain);
                      setNotesFailed(text === null);
                    }}
                  />
                  {notesFailed && (
                    <div className="flex items-center gap-1.5 text-xs text-rose-600 mt-3">
                      <AlertTriangle size={13} /> Couldn't read the handwriting — please try writing more clearly, or type it in manually below.
                    </div>
                  )}
                  {notesTranscription !== null && (
                    <div className="mt-3">
                      <Badge tone="amber">AI-transcribed text — Please verify</Badge>
                      {notesUncertain && (
                        <div className="flex items-center gap-1.5 text-xs text-rose-600 mt-1.5">
                          <AlertTriangle size={13} /> Some parts were unclear and are marked with [[double brackets]] — please correct them.
                        </div>
                      )}
                      <textarea
                        value={notesTranscription}
                        onChange={(e) => setNotesTranscription(e.target.value)}
                        rows={3}
                        className="w-full mt-2 px-3 py-2 rounded-lg border border-amber-300 bg-amber-50 text-sm focus:outline-none focus:border-amber-400"
                      />
                      <div className="flex gap-2 mt-2">
                        <button onClick={confirmNotesTranscription} className="text-xs bg-teal-700 text-white font-semibold px-3 py-1.5 rounded-lg">
                          Confirm & Add to Notes
                        </button>
                        <button
                          onClick={() => { setNotesTranscription(null); setNotesUncertain(false); setNotesFailed(false); }}
                          className="text-xs text-stone-500 font-medium px-3 py-1.5"
                        >
                          Discard
                        </button>
                      </div>
                    </div>
                  )}
                  <button onClick={() => { setShowNotesCanvas(false); setNotesTranscription(null); setNotesFailed(false); }} className="text-xs text-stone-400 mt-3 block">
                    Close handwriting input
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button icon={ClipboardPlus} onClick={handleCompleteConsultation} disabled={savingConsultation || !diagnosis.trim()}>
              {savingConsultation ? "Saving…" : "Complete Consultation"}
            </Button>
            {consultationSaved && <span className="text-sm text-emerald-600 font-medium">Saved ✓</span>}
          </div>
        </Card>
      )}

      {tab === "consent" && (
        <Card className="p-5 text-sm">
          <div className="flex items-center gap-2 mb-3"><ShieldCheck size={16} className="text-emerald-600" /> Consent granted at {p.consent.timestamp}</div>
          <div className="text-xs text-stone-400">Patient agreed to case information collection and document digitization for the purpose of preparing this consultation. Consent text version: {p.consent.consentTextVersion}.</div>
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
