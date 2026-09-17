"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Stethoscope, Mic, Hand, UserCircle2 } from "lucide-react";
import { Card, Badge } from "@/components/shared/Primitives";
import Button from "@/components/shared/Button";
import FloatingNav from "@/components/shared/FloatingNav";
import { useMediKioskStore } from "@/lib/data/store";
import { t } from "@/lib/i18n/translations";

const RETURNING_DEMO_IDENTITY = { name: "Ravi Kumar", age: 52, gender: "Male" as const, abhaId: "XX-XXXX-XXXX-1189" };

export default function PatientStartPage() {
  const router = useRouter();
  const [stage, setStage] = useState<"welcome" | "visit">("welcome");
  const [helpOpen, setHelpOpen] = useState(false);
  const lang = useMediKioskStore((s) => s.lang);
  const setLang = useMediKioskStore((s) => s.setLang);
  const visitType = useMediKioskStore((s) => s.visitType);
  const setVisitType = useMediKioskStore((s) => s.setVisitType);
  const pendingIdentity = useMediKioskStore((s) => s.pendingIdentity);
  const setPendingIdentity = useMediKioskStore((s) => s.setPendingIdentity);

  function begin() {
    setStage("visit");
  }

  function pickReturning() {
    setVisitType("returning");
    setPendingIdentity(RETURNING_DEMO_IDENTITY);
  }
  function pickNew() {
    setVisitType("new");
    setPendingIdentity({ name: "Guest Patient", age: "—", gender: "—", abhaId: null });
  }

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-8">
      <FloatingNav />
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <div className="font-serif-display text-2xl font-semibold text-teal-900">Rapha</div>
          <div className="text-xs text-stone-500">AYUSH Clinical Case-Taking Assistant</div>
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

        {stage === "visit" && (
          <Card className="p-8">
            <h2 className="font-serif-display text-xl font-semibold text-teal-900 mb-1">Have you visited this clinic before?</h2>
            <p className="text-sm text-stone-500 mb-6">This helps us use relevant previous information, with your consent, instead of asking everything again.</p>

            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              <button
                onClick={pickNew}
                className={`text-left p-5 rounded-xl border-2 transition-colors ${visitType === "new" ? "border-teal-700 bg-teal-50" : "border-stone-200 bg-white hover:border-teal-300"}`}
              >
                <div className="text-2xl mb-2">🆕</div>
                <div className="font-semibold text-stone-800 mb-0.5">First visit</div>
                <div className="text-xs text-stone-500">I haven't been to this clinic before.</div>
              </button>
              <button
                onClick={pickReturning}
                className={`text-left p-5 rounded-xl border-2 transition-colors ${visitType === "returning" ? "border-teal-700 bg-teal-50" : "border-stone-200 bg-white hover:border-teal-300"}`}
              >
                <div className="text-2xl mb-2">🔄</div>
                <div className="font-semibold text-stone-800 mb-0.5">I have visited before</div>
                <div className="text-xs text-stone-500">Look up my ABHA-linked information.</div>
              </button>
            </div>

            {visitType === "returning" && pendingIdentity && (
              <Card className="p-5 mb-6 bg-teal-50 border-teal-100">
                <div className="flex items-center gap-2 mb-1"><UserCircle2 size={16} className="text-teal-700" /> <Badge tone="teal">DEMO DATA — simulated ABHA lookup</Badge></div>
                <p className="text-xs text-stone-500 mt-2 mb-3">For this prototype, no real Aadhaar or ABHA authentication happens here — this is a simulated match.</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><div className="text-stone-500 text-xs">Patient</div><div className="font-semibold">{pendingIdentity.name}</div></div>
                  <div><div className="text-stone-500 text-xs">Age</div><div className="font-semibold">{pendingIdentity.age}</div></div>
                  <div><div className="text-stone-500 text-xs">Gender</div><div className="font-semibold">{pendingIdentity.gender}</div></div>
                  <div><div className="text-stone-500 text-xs">ABHA</div><div className="font-semibold">{pendingIdentity.abhaId}</div></div>
                </div>
              </Card>
            )}

            {visitType === "new" && pendingIdentity && (
              <Card className="p-5 mb-6 bg-stone-50">
                <div className="text-sm text-stone-600">Continuing as <span className="font-semibold">{pendingIdentity.name}</span> — no ABHA record needed for a first visit.</div>
              </Card>
            )}

            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setStage("welcome")}>Back</Button>
              <Button disabled={!visitType} onClick={() => router.push("/patient/consent")} className="flex-1">Continue</Button>
            </div>
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
