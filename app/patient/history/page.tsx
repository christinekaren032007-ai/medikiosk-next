"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserCircle2, Sparkles, Mic, ChevronLeft, ChevronRight, Users, Loader2, CheckCircle2, Pencil } from "lucide-react";
import { Card, Badge, ChipButton } from "@/components/shared/Primitives";
import Button from "@/components/shared/Button";
import ProgressSteps from "@/components/shared/ProgressSteps";
import FloatingNav from "@/components/shared/FloatingNav";
import { useRaphaStore } from "@/lib/data/store";
import { getFullFlow } from "@/lib/ai/historyEngine";
import { FAMILY_CONDITIONS, RELATION_OPTIONS, FollowUpQA, FollowUpQuestion, InterviewField } from "@/types/clinical";
import { MAX_FOLLOW_UP_QUESTIONS } from "@/lib/ai/gemini";
import { translateField } from "@/lib/i18n/questions";

const STEPS = ["Identify", "Consent", "History", "Documents", "Review", "Complete"];
const NO_FAMILY_HISTORY = "No known family medical history";

const SECTION_LABEL: Record<string, string> = {
  hpi: "History of Present Illness",
  ayush: "AYUSH Case Information",
  lifestyle: "Ahara-Vihara — Diet & Lifestyle",
  medical_history: "Relevant Medical History",
};

const SPEECH_LANG: Record<string, string> = { en: "en-IN", ta: "ta-IN", hi: "hi-IN" };

export default function HistoryPage() {
  const router = useRouter();
  const hydrated = useRaphaStore((s) => s.hydrated);
  const draft = useRaphaStore((s) => s.draft);
  const lang = useRaphaStore((s) => s.lang);
  const answerField = useRaphaStore((s) => s.answerField);
  const syncDraft = useRaphaStore((s) => s.syncDraft);
  const setFamilyHistory = useRaphaStore((s) => s.setFamilyHistory);
  const fetchFollowUpQuestion = useRaphaStore((s) => s.fetchFollowUpQuestion);
  const answerFollowUp = useRaphaStore((s) => s.answerFollowUp);
  const [stepIndex, setStepIndex] = useState(0);
  const [listening, setListening] = useState(false);
  const [voicePending, setVoicePending] = useState<{ transcript: string; mapped: string | string[] | number | null } | null>(null);
  const [voiceMapping, setVoiceMapping] = useState(false);

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

  const flow = useMemo(() => getFullFlow(), []);

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
  const translated = translateField(lang, field);
  const prevSection = stepIndex > 0 ? flow[stepIndex - 1].section : null;
  const showSectionHeader = field.section !== prevSection;

  async function next() {
    await syncDraft();
    setVoicePending(null);
    if (stepIndex < flow.length - 1) setStepIndex((i) => i + 1);
    else setPhase("family");
  }
  async function prev() {
    await syncDraft();
    setVoicePending(null);
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
    const finalAnswer = followUpQuestion.type === "multi_choice" ? followUpMultiSelected.join(", ") : followUpAnswer.trim();
    if (!finalAnswer) return;
    await answerFollowUp(followUpQuestion, finalAnswer);
    setFollowUpHistory((h) => [...h, { question: followUpQuestion.question, answer: finalAnswer, type: followUpQuestion.type, section: followUpQuestion.section, reason: followUpQuestion.reason }]);
    setFollowUpQuestion(null);
    setFollowUpAnswer("");
    setFollowUpMultiSelected([]);
    if (followUpHistory.length + 1 >= MAX_FOLLOW_UP_QUESTIONS) setFollowUpDone(true);
  }

  function startVoice(target: InterviewField) {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setListening(true);
      setTimeout(() => setListening(false), 1200);
      return;
    }
    const recognition = new SR();
    recognition.lang = SPEECH_LANG[lang] || "en-IN";
    setListening(true);
    recognition.onresult = async (e: any) => {
      const transcript = e.results?.[0]?.[0]?.transcript;
      setListening(false);
      if (!transcript) return;
      setVoiceMapping(true);
      try {
        const res = await fetch("/api/ai/interpret-voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript, type: target.type, question: target.question, options: target.options }),
        });
        const data = await res.json();
        setVoicePending({ transcript, mapped: data.result?.value ?? null });
      } catch {
        setVoicePending({ transcript, mapped: null });
      } finally {
        setVoiceMapping(false);
      }
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
  }

  function confirmVoiceAnswer() {
    if (!voicePending) return;
    const value = voicePending.mapped ?? voicePending.transcript;
    answerField(field.id, value as any);
    setVoicePending(null);
  }

  const capturedRows = flow
    .slice(0, stepIndex + 1)
    .filter((f) => draft.answers[f.id] !== undefined)
    .map((f) => [f.technicalTerm ? `${f.question.split("?")[0]} (${f.technicalTerm})` : f.question.split("?")[0], Array.isArray(draft.answers[f.id]) ? (draft.answers[f.id] as string[]).join(", ") : String(draft.answers[f.id])]);

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-8">
      <FloatingNav />
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="font-serif-display text-2xl font-semibold text-teal-900">Rapha</div>
            <div className="text-xs text-stone-500">AYUSH Case-Taking Assistant</div>
          </div>
          <ProgressSteps steps={STEPS} activeIndex={2} />
        </div>

        <div className="grid lg:grid-cols-[1fr_1.4fr_1fr] gap-4">
          <Card className="p-5 h-fit">
            <div className="flex items-center gap-2 mb-3"><UserCircle2 size={18} className="text-teal-700" /><span className="font-semibold text-sm">{draft.name}</span></div>
            <div className="text-xs text-stone-500 mb-4">{draft.age !== "—" ? `${draft.age} yrs • ${draft.gender}` : "Guest patient"}</div>
            <div className="text-xs font-semibold text-stone-500 mb-2">CHIEF COMPLAINT</div>
            <Badge tone="teal">{draft.chiefComplaintLabel}</Badge>
          </Card>

          <Card className="p-6">
            {phase === "questions" && (
              <>
                {showSectionHeader && (
                  <div className="text-xs font-bold text-teal-700 uppercase tracking-wide mb-3">{SECTION_LABEL[field.section]}</div>
                )}
                <div className="flex items-center gap-2 mb-4 text-xs text-stone-400">
                  <Sparkles size={14} /> Question {stepIndex + 1} of {flow.length}
                </div>
                <h3 className="font-serif-display text-lg font-semibold text-stone-800 mb-1">
                  {translated.question}
                  {field.technicalTerm && <span className="text-teal-700 font-normal text-base"> ({field.technicalTerm})</span>}
                </h3>
                <div className="mb-5" />

                {field.type === "choice" && (
                  <div className="grid sm:grid-cols-2 gap-2 mb-6">
                    {translated.options?.map((opt, i) => {
                      const canonical = field.options![i];
                      return (
                        <ChipButton key={opt} selected={val === canonical} onClick={() => answerField(field.id, canonical)}>{opt}</ChipButton>
                      );
                    })}
                  </div>
                )}
                {field.type === "multi" && (
                  <div className="grid sm:grid-cols-2 gap-2 mb-6">
                    {translated.options?.map((opt, i) => {
                      const canonical = field.options![i];
                      const arr = (val as string[]) || [];
                      const sel = arr.includes(canonical);
                      const exclusive = canonical === "None" || canonical === "Nothing noticed" || canonical === "Nothing helps";
                      return (
                        <ChipButton
                          key={opt}
                          selected={sel}
                          onClick={() => {
                            let nextVal: string[];
                            if (exclusive) nextVal = [canonical];
                            else nextVal = sel ? arr.filter((a) => a !== canonical) : [...arr.filter((a) => a !== "None" && a !== "Nothing noticed" && a !== "Nothing helps"), canonical];
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
                      placeholder="Type or speak your answer…"
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-teal-400"
                    />
                  </div>
                )}

                <div className="flex items-center gap-3 mb-2">
                  <button onClick={() => startVoice(field)} className={`w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0 ${listening ? "bg-rose-600 animate-pulse" : "bg-teal-700"}`}>
                    <Mic size={18} />
                  </button>
                  <span className="text-xs text-stone-400">{listening ? "Listening…" : voiceMapping ? "Understanding your answer…" : "or tap the mic and speak your answer"}</span>
                </div>

                {voicePending && (
                  <Card className="p-4 mb-4 bg-teal-50 border-teal-100">
                    <div className="text-xs text-stone-500 mb-1">We heard: "{voicePending.transcript}"</div>
                    <div className="text-sm font-semibold text-teal-900 mb-3">
                      We understood: {Array.isArray(voicePending.mapped) ? voicePending.mapped.join(", ") : voicePending.mapped ?? voicePending.transcript}
                    </div>
                    <div className="flex gap-2">
                      <Button className="text-xs px-3 py-1.5" icon={CheckCircle2} onClick={confirmVoiceAnswer}>Yes, that's right</Button>
                      <Button variant="secondary" className="text-xs px-3 py-1.5" icon={Pencil} onClick={() => setVoicePending(null)}>Let me fix it</Button>
                    </div>
                  </Card>
                )}

                <div className="flex gap-3 mt-4">
                  <Button variant="secondary" icon={ChevronLeft} onClick={prev}>Back</Button>
                  <Button icon={ChevronRight} disabled={val === undefined || val === ""} onClick={next} className="flex-1">Next</Button>
                </div>
              </>
            )}

            {phase === "family" && (
              <>
                <div className="flex items-center gap-2 mb-4 text-xs text-teal-700 font-semibold"><Users size={14} /> Family medical history</div>
                <h3 className="font-serif-display text-lg font-semibold text-stone-800 mb-2">Does anyone in your family have these conditions?</h3>
                <p className="text-sm text-stone-500 mb-5">Select any that apply. This helps the practitioner understand your background — it's optional.</p>
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
                    <div className="text-sm text-stone-500">Preparing a helpful question…</div>
                  </div>
                )}
                {!followUpLoading && followUpQuestion && (
                  <>
                    <div className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">{followUpQuestion.section}</div>
                    <h3 className="font-serif-display text-lg font-semibold text-stone-800 mb-5">{followUpQuestion.question}</h3>

                    {(followUpQuestion.type === "single_choice" || followUpQuestion.type === "yes_no") && (
                      <div className="grid sm:grid-cols-2 gap-2 mb-6">
                        {followUpQuestion.options.map((opt) => (
                          <ChipButton key={opt} selected={followUpAnswer === opt} onClick={() => setFollowUpAnswer(opt)}>{opt}</ChipButton>
                        ))}
                      </div>
                    )}

                    {followUpQuestion.type === "multi_choice" && (
                      <div className="grid sm:grid-cols-2 gap-2 mb-6">
                        {followUpQuestion.options.map((opt) => (
                          <ChipButton key={opt} selected={followUpMultiSelected.includes(opt)} onClick={() => toggleFollowUpMultiOption(opt)}>{opt}</ChipButton>
                        ))}
                      </div>
                    )}

                    {followUpQuestion.type === "slider" && (
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

                    {followUpQuestion.type === "text" && (
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
                          followUpQuestion.type === "multi_choice"
                            ? followUpMultiSelected.length === 0
                            : followUpQuestion.type === "slider"
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
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
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
