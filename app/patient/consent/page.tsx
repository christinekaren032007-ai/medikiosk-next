"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Volume2, Lock, ShieldCheck } from "lucide-react";
import { Card } from "@/components/shared/Primitives";
import Button from "@/components/shared/Button";
import ProgressSteps from "@/components/shared/ProgressSteps";
import FloatingNav from "@/components/shared/FloatingNav";
import { useMediKioskStore } from "@/lib/data/store";
import { t } from "@/lib/i18n/translations";

const STEPS = ["Identify", "Consent", "History", "Documents", "Review", "Complete"];

export default function ConsentPage() {
  const router = useRouter();
  const lang = useMediKioskStore((s) => s.lang);
  const hydrated = useMediKioskStore((s) => s.hydrated);
  const draft = useMediKioskStore((s) => s.draft);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [declined, setDeclined] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  function toggleAudio() {
    setAudioPlaying((p) => !p);
    clearTimeout(timer.current);
    if (!audioPlaying) timer.current = setTimeout(() => setAudioPlaying(false), 4000);
  }

  if (!hydrated) return null;
  if (!draft) {
    router.replace("/patient");
    return null;
  }

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-8">
      <FloatingNav />
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="font-serif-display text-2xl font-semibold text-teal-900">MediKiosk</div>
            <div className="text-xs text-stone-500">Clinical Intake Assistant</div>
          </div>
          <ProgressSteps steps={STEPS} activeIndex={1} />
        </div>

        <Card className="p-8">
          <h2 className="font-serif-display text-xl font-semibold text-teal-900 mb-3">Your Information & Privacy</h2>
          <p className="text-sm text-stone-600 mb-4 leading-relaxed">
            We will ask about your health and allow you to upload previous medical documents. This information will be used to prepare your medical history for your doctor.
          </p>
          <button onClick={toggleAudio} className="flex items-center gap-2 text-sm text-teal-700 font-semibold mb-6">
            <Volume2 size={16} className={audioPlaying ? "animate-pulse" : ""} /> Listen to explanation
          </button>
          {audioPlaying && (
            <div className="mb-6 h-1.5 bg-stone-100 rounded-full overflow-hidden">
              <div className="h-full bg-teal-600 rounded-full" style={{ width: "100%", transition: "width 4s linear" }} />
            </div>
          )}
          <div className="grid grid-cols-3 gap-2 mb-6 text-center">
            <div className="p-3 bg-stone-50 rounded-xl"><Lock size={16} className="mx-auto text-teal-700 mb-1" /><div className="text-[11px] text-stone-500">Privacy protected</div></div>
            <div className="p-3 bg-stone-50 rounded-xl"><ShieldCheck size={16} className="mx-auto text-teal-700 mb-1" /><div className="text-[11px] text-stone-500">Consent required</div></div>
            <div className="p-3 bg-stone-50 rounded-xl"><Lock size={16} className="mx-auto text-teal-700 mb-1" /><div className="text-[11px] text-stone-500">Session protected</div></div>
          </div>

          {declined && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-700 text-sm">
              We're unable to prepare your history without consent. You can still see a staff member directly, or tap "I Agree" if you change your mind.
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <Button variant="secondary" onClick={() => setDeclined(true)}>{t(lang, "disagree")}</Button>
            <Button onClick={() => router.push("/patient/history")}>{t(lang, "agree")}</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
