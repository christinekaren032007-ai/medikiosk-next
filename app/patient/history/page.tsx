"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserCircle2, Sparkles, Mic, ChevronLeft, ChevronRight, AlertTriangle, PhoneCall, Users, Loader2 } from "lucide-react";
import { Card, Badge, ChipButton } from "@/components/shared/Primitives";
import Button from "@/components/shared/Button";
import ProgressSteps from "@/components/shared/ProgressSteps";
import FloatingNav from "@/components/shared/FloatingNav";
import { useMediKioskStore } from "@/lib/data/store";
import { getFlow } from "@/lib/ai/historyEngine";
import { evaluateRedFlag } from "@/lib/ai/redFlagEngine";
import { FAMILY_CONDITIONS, RELATION_OPTIONS, FollowUpQA, FollowUpQuestion } from "@/types/clinical";

const STEPS = ["Identify", "Consent", "History", "Documents", "Review", "Complete"];
const MAX_FOLLOW_UP = 3;
const NO_FAMILY_HISTORY = "No known family medical history";

export default function HistoryPage() {
  const router = useRouter();
  const hydrated = useMediKioskStore((s) => s.hydrated);
  const draft = useMediKioskStore((s) => s.draft);
  const answerField = useMediKioskStore((s) => s.answerField);
  const syncDraft = useMediKioskStore((s) => s.syncDraft);
  const ayushMode = useMediKioskStore((s) => s.ayushMode);
  const toggleAyush = useMediKioskStore((s) => s.toggleAyush);
  const setFamilyHistory = useMediKioskStore((s) => s.setFamilyHistory);
  const fetchFollowUpQuestion = useMediKioskStore((s) => s.fetchFollowUpQuestion);
  const answerFollowUp = useMediKioskStore((s) => s.answerFollowUp);
  const [stepIndex, setStepIndex] = useState(0);
  const [listening, setListening] = useState(false);
  const [staffCalled, setStaffCalled] = useState(false);

  const [phase, setPhase] = useState<"questions" | "family" | "followup">("questions");
  const [familySelected, setFamilySelected] = useState<string[]>([]);
  const [familyDetails, setFamilyDetails] = useState<Record<string, string>>({});
  const [familyRelation, setFamilyRelation] = useState<Record<string, string>>({});

  const [followUpQuestion, setFollowUpQuestion] = useState<FollowUpQuestion | null>(null);
  const [followUpAnswer, setFollowUpAnswer] = useState("");
  const [followUpMultiSelected, setFollowUpMultiSelected] = useState<string[]>([]);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [followUpDone, setFollowUpDone] = useState(false);
  const [followUpUnavailable, setFollowUpUnavailable] = useState(false);
  const [followUpHistory, setFollowUpHistory] = useState<FollowUpQA[]>([]);

  const flow = useMemo(() => getFlow(ayushMode ? "ayush" : draft?.chiefComplaintCategory || "chest_pain"), [ayushMode, draft]);

  useEffect(() => {
    if (phase === "followup" && !followUpQuestion && !followUpLoading && !followUpDone) {
      loadNextFollowUp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, followUpDone, followUpQuestion]);

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
    else setPhase("family");
  }
  async function prev() {
    await syncDraft();
    if (stepIndex > 0) setStepIndex((i) => i - 1);
    else router.push("/patient/consent");
  }

  function toggleFamilyCondition(condition: string) {
    if (condition === NO_FAMILY_HISTORY) {
      setFamilySelected([NO_FAMILY_HISTORY]);
      return;
    }
    setFamilySelected((prev) => {
      const withoutNone = prev.filter((c) => c !== NO_FAMILY_HISTORY);
      return withoutNone.includes(condition) ? withoutNone.filter((c) => c !== condition) : [...withoutNone, condition];
    });
  }

  async function continueFromFamily() {
    const noFamilyHistory = familySelected.includes(NO_FAMILY_HISTORY);
    const entries = noFamilyHistory
      ? []
      : familySelected.map((condition) => ({
          condition,
          relation: familyRelation[condition] || undefined,
          details: familyDetails[condition] || undefined,
        }));
    await setFamilyHistory(entries, noFamilyHistory);
    setPhase("followup");
  }

  async function loadNextFollowUp() {
    setFollowUpLoading(true);
    setFollowUpUnavailable(false);
    const question = await fetchFollowUpQuestion();
    setFollowUpLoading(false);
    if (!question) {
      setFollowUpDone(true);
      if (followUpHistory.length === 0) setFollowUpUnavailable(true);
      return;
    }
    setFollowUpQuestion(question);
  }

  function toggleFollowUpMultiOption(opt: string) {
    setFollowUpMultiSelected((prev) => (prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]));
  }

  async function submitFollowUpAnswer() {
    if (!followUpQuestion) return;
    const finalAnswer = followUpQuestion.responseType === "multiple_choice" ? followUpMultiSelected.join(", ") : followUpAnswer.trim();
    if (!finalAnswer) return;
    await answerFollowUp(followUpQuestion.question, finalAnswer);
    setFollowUpHistory((h) => [...h, { question: followUpQuestion.question, answer: finalAnswer }]);
    setFollowUpQuestion(null);
    setFollowUpAnswer("");
    setFollowUpMultiSelected([]);
    if (followUpHistory.length + 1 >= MAX_FOLLOW_UP) setFollowUpDone(true);
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
            <div className="font-serif-display text-2xl font-semibold text-teal-900">Rapha</div>
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
            {phase === "questions" && (
              <>
                <div className="flex items-center gap-2 mb-4 text-xs text-teal-700 font-semibold"><Sparkles size={14} /> Rapha — clinical intake assistant</div>
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
                {field.type === "text" && (
                  <div className="mb-6">
                    <textarea
                      value={(val as string) ?? ""}
                      onChange={(e) => answerField(field.id, e.target.value)}
                      rows={3}
                      placeholder="Type your answer…"
                      autoFocus
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-teal-400"
                    />
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
              </>
            )}

            {phase === "family" && (
              <>
                <div className="flex items-center gap-2 mb-4 text-xs text-teal-700 font-semibold"><Users size={14} /> Family medical history</div>
                <h3 className="font-serif-display text-lg font-semibold text-stone-800 mb-2">Does anyone in your family have these conditions?</h3>
                <p className="text-sm text-stone-500 mb-5">Select any that apply. This helps the doctor understand your background — it's optional.</p>
                <div className="grid sm:grid-cols-2 gap-2 mb-4">
                  {FAMILY_CONDITIONS.map((cond) => (
                    <ChipButton key={cond} selected={familySelected.includes(cond)} onClick={() => toggleFamilyCondition(cond)}>{cond}</ChipButton>
                  ))}
                  <ChipButton selected={familySelected.includes(NO_FAMILY_HISTORY)} onClick={() => toggleFamilyCondition(NO_FAMILY_HISTORY)}>
                    {NO_FAMILY_HISTORY}
                  </ChipButton>
                </div>
                {familySelected.filter((c) => c !== NO_FAMILY_HISTORY).length > 0 && (
                  <div className="space-y-2 mb-6">
                    {familySelected.filter((c) => c !== NO_FAMILY_HISTORY).map((cond) => (
                      <div key={cond} className="grid grid-cols-[auto_1fr] gap-2">
                        <div className="text-xs font-semibold text-stone-500 self-center min-w-[110px]">{cond}</div>
                        <select
                          value={familyRelation[cond] || ""}
                          onChange={(e) => setFamilyRelation((r) => ({ ...r, [cond]: e.target.value }))}
                          className="px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-teal-400 bg-white"
                        >
                          <option value="">Who? (optional)</option>
                          {RELATION_OPTIONS.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                        <div />
                        <input
                          value={familyDetails[cond] || ""}
                          onChange={(e) => setFamilyDetails((d) => ({ ...d, [cond]: e.target.value }))}
                          placeholder="Any other details (optional)"
                          className="px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-teal-400"
                        />
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-3">
                  <Button variant="secondary" icon={ChevronLeft} onClick={() => setPhase("questions")}>Back</Button>
                  <Button icon={ChevronRight} disabled={familySelected.length === 0} onClick={continueFromFamily} className="flex-1">Continue</Button>
                </div>
              </>
            )}

            {phase === "followup" && (
              <>
                <div className="flex items-center gap-2 mb-4 text-xs text-teal-700 font-semibold"><Sparkles size={14} /> A few quick follow-up questions</div>
                {followUpLoading && (
                  <div className="p-8 text-center">
                    <Loader2 size={24} className="mx-auto text-teal-700 animate-spin mb-3" />
                    <div className="text-sm text-stone-500">Thinking of a helpful question…</div>
                  </div>
                )}
                {!followUpLoading && followUpQuestion && (
                  <>
                    <h3 className="font-serif-display text-lg font-semibold text-stone-800 mb-5">{followUpQuestion.question}</h3>

                    {followUpQuestion.responseType === "single_choice" && (
                      <div className="grid sm:grid-cols-2 gap-2 mb-6">
                        {followUpQuestion.options.map((opt) => (
                          <ChipButton key={opt} selected={followUpAnswer === opt} onClick={() => setFollowUpAnswer(opt)}>{opt}</ChipButton>
                        ))}
                      </div>
                    )}

                    {followUpQuestion.responseType === "multiple_choice" && (
                      <div className="grid sm:grid-cols-2 gap-2 mb-6">
                        {followUpQuestion.options.map((opt) => (
                          <ChipButton key={opt} selected={followUpMultiSelected.includes(opt)} onClick={() => toggleFollowUpMultiOption(opt)}>{opt}</ChipButton>
                        ))}
                      </div>
                    )}

                    {followUpQuestion.responseType === "numeric_scale" && (
                      <div className="mb-6">
                        <input
                          type="range"
                          min={0}
                          max={10}
                          value={followUpAnswer === "" ? 0 : Number(followUpAnswer)}
                          onChange={(e) => setFollowUpAnswer(e.target.value)}
                          className="w-full"
                        />
                        <div className="text-center font-serif-display text-3xl text-teal-800 mt-2">
                          {followUpAnswer === "" ? 0 : Number(followUpAnswer)}
                          <span className="text-sm text-stone-400">/10</span>
                        </div>
                      </div>
                    )}

                    {followUpQuestion.responseType === "free_text" && (
                      <input
                        value={followUpAnswer}
                        onChange={(e) => setFollowUpAnswer(e.target.value)}
                        placeholder="Type your answer…"
                        autoFocus
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm mb-6 focus:outline-none focus:border-teal-400"
                      />
                    )}

                    <div className="flex gap-3">
                      <Button variant="secondary" onClick={() => setFollowUpDone(true)}>Skip remaining questions</Button>
                      <Button
                        icon={ChevronRight}
                        disabled={
                          followUpQuestion.responseType === "multiple_choice"
                            ? followUpMultiSelected.length === 0
                            : followUpQuestion.responseType === "numeric_scale"
                              ? false
                              : !followUpAnswer.trim()
                        }
                        onClick={submitFollowUpAnswer}
                        className="flex-1"
                      >
                        Next
                      </Button>
                    </div>
                  </>
                )}
                {!followUpLoading && !followUpQuestion && followUpDone && (
                  <>
                    <p className="text-sm text-stone-600 mb-6">
                      {followUpUnavailable
                        ? "AI follow-up questions aren't available right now — you can continue with your intake as normal."
                        : "That's all the follow-up questions for now."}
                    </p>
                    <Button icon={ChevronRight} onClick={() => router.push("/patient/documents")} className="w-full">Continue</Button>
                  </>
                )}
              </>
            )}
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
