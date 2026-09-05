"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, Check } from "lucide-react";
import { Card, Badge } from "@/components/shared/Primitives";
import Button from "@/components/shared/Button";
import FloatingNav from "@/components/shared/FloatingNav";
import { useMediKioskStore } from "@/lib/data/store";
import { t } from "@/lib/i18n/translations";

export default function CompletePage() {
  const router = useRouter();
  const lastToken = useMediKioskStore((s) => s.lastToken);
  const resetDraft = useMediKioskStore((s) => s.resetDraft);
  const lang = useMediKioskStore((s) => s.lang);

  function startOver() {
    resetDraft();
    router.push("/patient");
  }

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-8">
      <FloatingNav />
      <div className="max-w-lg mx-auto">
        <Card className="p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={30} className="text-emerald-600" />
          </div>
          <h2 className="font-serif-display text-xl font-semibold text-teal-900 mb-2">{t(lang, "completeTitle")}</h2>
          <div className="space-y-2 text-left max-w-xs mx-auto my-6">
            {["History captured", "Documents digitized", "Clinical summary generated", "Doctor notified"].map((x) => (
              <div key={x} className="flex items-center gap-2 text-sm text-stone-600"><Check size={14} className="text-emerald-600" /> {x}</div>
            ))}
          </div>
          <div className="text-4xl font-serif-display font-semibold text-teal-800 mb-1">{lastToken || "—"}</div>
          <div className="text-xs text-stone-400 mb-6">Your token number</div>
          <p className="text-sm text-stone-600 mb-4">{t(lang, "proceed")}</p>
          <Badge tone="stone">ABDM/FHIR Integration — Demo Simulation</Badge>
          <div className="mt-8 flex justify-center gap-3">
            <Button variant="ghost" onClick={startOver}>Start a new intake</Button>
            <Button variant="secondary" onClick={() => router.push("/doctor")}>Open Doctor Dashboard</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
