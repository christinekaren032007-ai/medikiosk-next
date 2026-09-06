"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Stethoscope, Mic, Hand, UserCircle2 } from "lucide-react";
import { Card, Badge, ChipButton } from "@/components/shared/Primitives";
import Button from "@/components/shared/Button";
import FloatingNav from "@/components/shared/FloatingNav";
import { useMediKioskStore } from "@/lib/data/store";
import { t } from "@/lib/i18n/translations";
import { CHIEF_COMPLAINTS } from "@/lib/ai/historyEngine";
import { ComplaintCategory } from "@/types/clinical";

export default function PatientStartPage() {
  const router = useRouter();
  const [stage, setStage] = useState<"welcome" | "complaint" | "identify">("welcome");
  const [helpOpen, setHelpOpen] = useState(false);
  const lang = useMediKioskStore((s) => s.lang);
  const setLang = useMediKioskStore((s) => s.setLang);
  const startPatient = useMediKioskStore((s) => s.startPatient);
  const setIdentity = useMediKioskStore((s) => s.setIdentity);
  const draft = useMediKioskStore((s) => s.draft);

  function begin() {
    setStage("complaint");
  }

  async function pickComplaint(category: ComplaintCategory) {
    await startPatient(category);
    setStage("identify");
  }

  function pickDemoIdentity() {
    setIdentity("Ravi Kumar", 52, "Male", "XX-XXXX-XXXX-1189");
  }
  function pickGuest() {
    setIdentity("Guest Patient", "—" as unknown as number, "—" as unknown as "Male", null);
  }

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-8">
      <FloatingNav />
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <div className="font-serif-display text-2xl font-semibold text-teal-900">MediKiosk</div>
          <div className="text-xs text-stone-500">Clinical Intake Assistant</div>
        </div>

        {stage === "welcome" && (
          <Card className="p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-teal-700 flex items-center justify-center mx-auto mb-6">
              <Stethoscope size={28} className="text-white" />
            </div>
            <h1 className="font-serif-display text-3xl font-semibold text-teal-900 mb-2">{t(lang, "welcomeTitle")}</h1>
            <p className="text-stone-600 mb-8">{t(lang, "welcomeSub")}</p>

            <div className="flex justify-center gap-2 mb-8">
              {(["en", "ta", "hi"] as const).map((code) => (
                <button
                  key={code}
                  onClick={() => setLang(code)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold border-2 ${lang === code ? "border-teal-700 bg-teal-700 text-white" : "border-stone-200 text-stone-600"}`}
                >
                  {code === "en" ? "English" : code === "ta" ? "தமிழ்" : "हिंदी"}
                </button>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              <Button icon={Mic} onClick={begin}>{t(lang, "startVoice")}</Button>
              <Button variant="secondary" icon={Hand} onClick={begin}>{t(lang, "startTouch")}</Button>
            </div>

            <button onClick={() => setHelpOpen(true)} className="text-xs text-stone-400 underline">{t(lang, "needHelp")}</button>
          </Card>
        )}

        {stage === "complaint" && (
          <Card className="p-8">
            <h2 className="font-serif-display text-xl font-semibold text-teal-900 mb-1">What brings you in today?</h2>
            <p className="text-sm text-stone-500 mb-6">Select what best describes your main concern. This helps us ask the right questions.</p>
            <div className="grid sm:grid-cols-2 gap-2 mb-6">
              {CHIEF_COMPLAINTS.filter((c) => c.key !== "ayush").map((c) => (
                <ChipButton key={c.key} selected={false} onClick={() => pickComplaint(c.key)}>{c.label}</ChipButton>
              ))}
            </div>
            <Button variant="ghost" onClick={() => setStage("welcome")} className="w-full">Back</Button>
          </Card>
        )}

        {stage === "identify" && draft && (
          <Card className="p-8">
            <h2 className="font-serif-display text-xl font-semibold text-teal-900 mb-1">Identify yourself</h2>
            <p className="text-sm text-stone-500 mb-6">For this prototype we use demo patient data — no real Aadhaar or ABHA authentication happens here.</p>

            {draft.abhaId ? (
              <Card className="p-5 mb-6 bg-teal-50 border-teal-100">
                <Badge tone="teal">DEMO DATA</Badge>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div><div className="text-stone-500 text-xs">Patient</div><div className="font-semibold">{draft.name}</div></div>
                  <div><div className="text-stone-500 text-xs">Age</div><div className="font-semibold">{draft.age}</div></div>
                  <div><div className="text-stone-500 text-xs">Gender</div><div className="font-semibold">{draft.gender}</div></div>
                  <div><div className="text-stone-500 text-xs">ABHA</div><div className="font-semibold">{draft.abhaId}</div></div>
                </div>
              </Card>
            ) : (
              <div className="grid gap-3 mb-6">
                <Button icon={UserCircle2} onClick={pickDemoIdentity}>Scan ABHA (demo)</Button>
                <Button variant="secondary" onClick={pickDemoIdentity}>Enter ABHA ID (demo)</Button>
                <Button variant="ghost" onClick={pickGuest}>New Patient</Button>
                <Button variant="ghost" onClick={pickGuest}>Continue as Guest</Button>
              </div>
            )}
            <Button onClick={() => router.push("/patient/consent")} className="w-full">Continue</Button>
          </Card>
        )}

        {helpOpen && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4" onClick={() => setHelpOpen(false)}>
            <Card className="p-6 max-w-sm w-full">
              <div className="font-semibold text-stone-800 mb-2">{t(lang, "needHelp")}</div>
              <p className="text-sm text-stone-600 mb-4">A staff member is available near the kiosk. You can also tap the microphone at any time and speak in your own words.</p>
              <Button onClick={() => setHelpOpen(false)} className="w-full">Got it</Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
