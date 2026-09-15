"use client";

import { useRouter } from "next/navigation";
import {
  Stethoscope, PlayCircle, LayoutDashboard, Sparkles, Mic, FileText,
  ClipboardList, ShieldCheck, Globe, Leaf, ArrowRight, BarChart3, ListChecks,
} from "lucide-react";
import { Card } from "@/components/shared/Primitives";
import Button from "@/components/shared/Button";
import DemoControlPanel from "@/components/shared/DemoControlPanel";
import { useRaphaStore } from "@/lib/data/store";
import { t } from "@/lib/i18n/translations";

const FEATURES = [
  { icon: Leaf, label: "AYUSH Case-Taking", desc: "Prakriti, Vikriti, Agni, Kostha, and Ahara-Vihara, in plain language." },
  { icon: Sparkles, label: "Adaptive AI Follow-ups", desc: "1-3 relevant questions at a time — never a generic chatbot." },
  { icon: Mic, label: "Voice + Touch, in 3 languages", desc: "English, Tamil, and Hindi, with confirmation before anything is saved." },
  { icon: FileText, label: "Medical Document Intelligence", desc: "Prior prescriptions and reports digitized, always patient-reviewed." },
  { icon: ClipboardList, label: "Practitioner Case Sheet", desc: "Structured, editable, ready before the consultation begins." },
  { icon: ListChecks, label: "Case Preparation", desc: "Shows how complete the case is — never a severity or risk score." },
  { icon: Globe, label: "Multilingual by Design", desc: "Built for elderly, low-literacy, and regional-language patients." },
  { icon: ShieldCheck, label: "ABDM/FHIR Ready", desc: "Architecture designed for national health interoperability." },
];
const PIPELINE = ["Patient", "AYUSH Case-Taking", "Document Intelligence", "Case Sheet", "Practitioner"];

export default function LandingPage() {
  const router = useRouter();
  const lang = useRaphaStore((s) => s.lang);

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-5xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-800 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          <Stethoscope size={14} /> Prototype — SIH 2026 · PS26047
        </div>
        <h1 className="font-serif-display text-5xl sm:text-6xl font-semibold text-teal-900 mb-4">{t(lang, "heroTitle")}</h1>
        <p className="text-lg text-stone-600 max-w-xl mx-auto mb-3">{t(lang, "heroSub")}</p>
        <p className="text-sm text-stone-500 max-w-lg mx-auto mb-8">{t(lang, "heroDesc")}</p>
        <div className="flex flex-wrap justify-center gap-3 mb-14">
          <Button onClick={() => router.push("/patient")} icon={PlayCircle}>{t(lang, "startPatient")}</Button>
          <Button variant="secondary" onClick={() => router.push("/doctor")} icon={LayoutDashboard}>{t(lang, "openDoctor")}</Button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 mb-16">
          {PIPELINE.map((p, i) => (
            <div key={p} className="flex items-center gap-2">
              <div className="bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-teal-800 shadow-sm">{p}</div>
              {i < PIPELINE.length - 1 && <ArrowRight size={16} className="text-stone-400" />}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-24 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {FEATURES.map((f) => (
          <Card key={f.label} className="p-5">
            <f.icon size={22} className="text-teal-700 mb-3" />
            <div className="font-semibold text-stone-800 text-sm mb-1">{f.label}</div>
            <div className="text-xs text-stone-500 leading-relaxed">{f.desc}</div>
          </Card>
        ))}
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-24 flex flex-wrap gap-3 justify-center">
        <Button variant="ghost" onClick={() => router.push("/admin")} icon={BarChart3}>View Admin Analytics</Button>
      </div>

      <div className="text-center text-xs text-stone-400 pb-2 px-4">Rapha is not an AI doctor and does not diagnose, triage, or prescribe — a qualified AYUSH practitioner makes all clinical decisions.</div>
      <div className="text-center text-xs text-stone-400 pb-10">Prototype — uses simulated patient data. Not for real clinical use.</div>
      <DemoControlPanel />
    </div>
  );
}
