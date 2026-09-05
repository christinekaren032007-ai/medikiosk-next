"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, X } from "lucide-react";
import { useMediKioskStore } from "@/lib/data/store";
import Button from "./Button";

export default function DemoControlPanel() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const loadScenario = useMediKioskStore((s) => s.loadScenario);
  const resetDemo = useMediKioskStore((s) => s.resetDemo);

  function runScenario(key: "chest_pain" | "fever" | "diabetes" | "ayush") {
    loadScenario(key);
    setOpen(false);
    router.push("/patient/review");
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="w-11 h-11 rounded-full bg-stone-800 text-white flex items-center justify-center shadow-lg opacity-70 hover:opacity-100"
          aria-label="Demo controls"
        >
          <Settings size={18} />
        </button>
      )}
      {open && (
        <div className="bg-white border border-stone-200 rounded-2xl shadow-xl p-4 w-64">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-stone-500">DEMO CONTROLS</span>
            <button onClick={() => setOpen(false)} aria-label="Close"><X size={15} className="text-stone-400" /></button>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <Button variant="amber" className="text-xs px-2 py-2" onClick={() => runScenario("chest_pain")}>Chest Pain</Button>
            <Button variant="amber" className="text-xs px-2 py-2" onClick={() => runScenario("fever")}>Fever</Button>
            <Button variant="amber" className="text-xs px-2 py-2" onClick={() => runScenario("diabetes")}>Diabetes</Button>
            <Button variant="amber" className="text-xs px-2 py-2" onClick={() => runScenario("ayush")}>AYUSH</Button>
          </div>
          <Button variant="secondary" className="w-full text-xs mb-2" onClick={() => { resetDemo(); setOpen(false); }}>Reset Demo</Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" className="text-xs px-2 py-2" onClick={() => { setOpen(false); router.push("/patient"); }}>Patient View</Button>
            <Button variant="ghost" className="text-xs px-2 py-2" onClick={() => { setOpen(false); router.push("/doctor"); }}>Doctor View</Button>
          </div>
        </div>
      )}
    </div>
  );
}
