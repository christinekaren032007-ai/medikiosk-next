"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { UserCircle2, Sparkles, Mic, ChevronLeft, ChevronRight, AlertTriangle, PhoneCall } from "lucide-react";
import { Card, Badge, ChipButton } from "@/components/shared/Primitives";
import Button from "@/components/shared/Button";
import ProgressSteps from "@/components/shared/ProgressSteps";
import FloatingNav from "@/components/shared/FloatingNav";
import { useMediKioskStore } from "@/lib/data/store";
import { getFlow } from "@/lib/ai/historyEngine";
import { evaluateRedFlag } from "@/lib/ai/redFlagEngine";

const STEPS = ["Identify", "Consent", "History", "Documents", "Review", "Complete"];

export default function HistoryPage() {
  const router = useRouter();
  const hydrated = useMediKioskStore((s) => s.hydrated);
  const draft = useMediKioskStore((s) => s.draft);
  const answerField = useMediKioskStore((s) => s.answerField);
  const syncDraft = useMediKioskStore((s) => s.syncDraft);
  const ayushMode = useMediKioskStore((s) => s.ayushMode);
  const toggleAyush = useMediKioskStore((s) => s.toggleAyush);
  const [stepIndex, setStepIndex] = useState(0);
  const [listening, setListening] = useState(false);
  const [staffCalled, setStaffCalled] = useState(false);

  const flow = useMemo(() => getFlow(ayushMode ? "ayush" : draft?.chiefComplaintCategory || "chest_pain"), [ayushMode, draft]);

  if (!hydrated) return null;
  if (!draft) {
    router.replace("/patient");
    return null;
  }

  const field = flow[stepIndex];
  const val = draft.answers[field.id];
  const redFlag = evaluateRedFlag(draft.chiefComplaintCategory, draft.answers);

  async function next() {
    await syncDraft();
    if (stepIndex < flow.length - 1) setStepIndex((i) => i + 1);
    else router.push("/patient/documents");
  }
  async function prev() {
    await syncDraft();
    if (stepIndex > 0) setStepIndex((i) => i - 1);
    else router.push("/patient/consent");
  }

  function startVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setListening(true);
      setTimeout(() => setListening(false), 1200);
      return;
    }
    const recognition = new SR();
    recognition.lang = "en-IN";
    setListening(true);
    recognition.onresult = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
  }

  const capturedRows = flow
    .slice(0, stepIndex + 1)
    .filter((f) => draft.answers[f.id] !== undefined)
    .map((f) => [f.question.split("?")[0], Array.isArray(draft.answers[f.id]) ? (draft.answers[f.id] as string[]).join(", ") : String(draft.answers[f.id])]);

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-8">
      <FloatingNav />
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="font-serif-display text-2xl font-semibold text-teal-900">MediKiosk</div>
            <div className="text-xs text-stone-500">Clinical Intake Assistant</div>
          </div>
          <ProgressSteps steps={STEPS} activeIndex={2} />
        </div>

        {redFlag.triggered && (
          <Card className="p-5 mb-5 border-2 border-rose-400 bg-rose-50">
            <div className="flex items-center gap-2 text-rose-700 font-bold text-sm mb-1"><AlertTriangle size={18} /> POSSIBLE EMERGENCY SYMPTOMS</div>
            <p className="text-sm text-rose-700 mb-3">{redFlag.reason} Please do not wait in the normal queue. A healthcare staff member has been notified.</p>
            <div className="flex gap-3">
              <Button variant="danger" icon={PhoneCall} onClick={() => setStaffCalled(true)}>{staffCalled ? "Staff notified ✓" : "Call Staff"}</Button>
              <Button variant="secondary" disabled={!staffCalled}>Continue Only With Staff Approval</Button>
            </div>
          </Card>
        )}

        <div className="grid lg:grid-cols-[1fr_1.4fr_1fr] gap-4">
          <Card className="p-5 h-fit">
            <div className="flex items-center gap-2 mb-3"><UserCircle2 size={18} className="text-teal-700" /><span className="font-semibold text-sm">{draft.name}</span></div>
            <div className="text-xs text-stone-500 mb-4">{draft.age !== "—" ? `${draft.age} yrs • ${draft.gender}` : "Guest patient"}</div>
            <div className="text-xs font-semibold text-stone-500 mb-2">CHIEF COMPLAINT</div>
            <Badge tone="teal">{draft.chiefComplaintLabel}</Badge>
            <label className="flex items-center gap-2 mt-6 text-xs text-stone-500">
              <input type="checkbox" checked={ayushMode} onChange={() => { toggleAyush(); setStepIndex(0); }} /> AYUSH history mode
            </label>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4 text-xs text-teal-700 font-semibold"><Sparkles size={14} /> MediKiosk — clinical intake assistant</div>
            <h3 className="font-serif-display text-lg font-semibold text-stone-800 mb-5">{field.question}</h3>

            {field.type === "choice" && (
              <div className="grid sm:grid-cols-2 gap-2 mb-6">
                {field.options?.map((opt) => (
                  <ChipButton key={opt} selected={val === opt} onClick={() => answerField(field.id, opt)}>{opt}</ChipButton>
                ))}
              </div>
            )}
            {field.type === "multi" && (
              <div className="grid sm:grid-cols-2 gap-2 mb-6">
                {field.options?.map((opt) => {
                  const arr = (val as string[]) || [];
                  const sel = arr.includes(opt);
                  return (
                    <ChipButton
                      key={opt}
                      selected={sel}
                      onClick={() => {
                        let nextVal: string[];
                        if (opt === "None") nextVal = ["None"];
                        else nextVal = sel ? arr.filter((a) => a !== opt) : [...arr.filter((a) => a !== "None"), opt];
                        answerField(field.id, nextVal);
                      }}
                    >
                      {opt}
                    </ChipButton>
                  );
                })}
              </div>
            )}
            {field.type === "slider" && (
              <div className="mb-6">
                <input type="range" min={0} max={10} value={(val as number) ?? 0} onChange={(e) => answerField(field.id, Number(e.target.value))} className="w-full" />
                <div className="text-center font-serif-display text-3xl text-teal-800 mt-2">{(val as number) ?? 0}<span className="text-sm text-stone-400">/10</span></div>
              </div>
            )}

            <div className="flex items-center gap-3 mb-4">
              <button onClick={startVoice} className={`w-11 h-11 rounded-full flex items-center justify-center text-white ${listening ? "bg-rose-600 animate-pulse" : "bg-teal-700"}`}>
                <Mic size={18} />
              </button>
              <span className="text-xs text-stone-400">{listening ? "Listening…" : "or choose an option / speak instead"}</span>
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" icon={ChevronLeft} onClick={prev}>Back</Button>
              <Button icon={ChevronRight} disabled={val === undefined || val === ""} onClick={next} className="flex-1">Next</Button>
            </div>
          </Card>

          <Card className="p-5 h-fit">
            <div className="text-xs font-semibold text-stone-500 mb-3">INFORMATION CAPTURED</div>
            <div className="space-y-3">
              {capturedRows.length === 0 && <div className="text-xs text-stone-400 italic">Nothing captured yet…</div>}
              {capturedRows.map(([k, v]) => (
                <div key={k}>
                  <div className="text-[11px] text-stone-400">{k}</div>
                  <div className="text-sm font-medium text-stone-700">{v}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
