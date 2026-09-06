"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, FileText, Edit3, Check, CheckCircle2, RotateCcw, ShieldCheck, Code2, Plus, Trash2, ClipboardPlus, PenLine, AlertTriangle } from "lucide-react";
import { Card, Badge } from "@/components/shared/Primitives";
import Button from "@/components/shared/Button";
import FloatingNav from "@/components/shared/FloatingNav";
import HandwritingCanvas from "@/components/doctor/HandwritingCanvas";
import { useMediKioskStore } from "@/lib/data/store";
import { toFhirBundle } from "@/lib/fhir/transformer";
import { PatientRecord } from "@/types/patient";
import { Medicine } from "@/types/ai";

const TABS = ["overview", "history", "documents", "timeline", "summary", "consultation", "consent"] as const;
type Tab = (typeof TABS)[number];

const EMPTY_MEDICINE: Medicine = { name: "", dosage: "", frequency: "", duration: "" };

export default function PatientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const confirmSummary = useMediKioskStore((s) => s.confirmSummary);
  const regenerateSummary = useMediKioskStore((s) => s.regenerateSummary);
  const saveConsultation = useMediKioskStore((s) => s.saveConsultation);
  const [tab, setTab] = useState<Tab>("overview");
  const [showFhir, setShowFhir] = useState(false);
  const [p, setP] = useState<PatientRecord | null>(null);
  const [notFound, setNotFound] = useState(false);

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
      // Never silently lose doctor-confirmed content: if it couldn't be
      // structured into medicine rows, keep it visible in Additional
      // Instructions instead of discarding it.
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

          <div className="pb-3">
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
          </div>

          {!!p.history.aiFollowUp?.length && (
            <div>
              <div className="text-xs text-stone-400 mb-1.5">AI Follow-up Questions</div>
              <div className="space-y-2">
                {p.history.aiFollowUp.map((qa, i) => (
                  <div key={i} className="text-sm">
                    <div className="text-stone-500">{qa.question}</div>
                    <div className="font-medium">{qa.answer}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
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

          {p.summary.aiGenerated && p.summary.aiNarrative && (
            <div className="mb-5 p-4 rounded-xl bg-teal-50 border border-teal-100">
              <Badge tone="teal">AI-generated clinical summary based on patient-provided information. This is not a diagnosis.</Badge>
              <p className="text-sm text-stone-700 mt-3 whitespace-pre-wrap">{p.summary.aiNarrative}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={handleConfirm} icon={CheckCircle2}>Confirm Summary</Button>
            <Button variant="secondary" icon={RotateCcw} onClick={handleRegenerate}>Regenerate</Button>
          </div>
        </Card>
      )}

      {tab === "consultation" && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="font-semibold text-stone-800">Clinical Assessment &amp; Prescription</div>
            {p.consultation && <Badge tone="emerald">Consultation completed at {new Date(p.consultation.completedAt).toLocaleString()}</Badge>}
          </div>

          <div className="mb-5">
            <label className="text-xs font-semibold text-stone-500 mb-1.5 block">Diagnosis</label>
            <textarea
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              rows={2}
              placeholder="Doctor's diagnosis…"
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-teal-400"
            />
          </div>

          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-stone-500">Prescribed Medicines</label>
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
            <label className="text-xs font-semibold text-stone-500 mb-1.5 block">Doctor's Notes</label>
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
