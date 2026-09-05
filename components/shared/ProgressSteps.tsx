"use client";

import { Check } from "lucide-react";

export default function ProgressSteps({ steps, activeIndex }: { steps: string[]; activeIndex: number }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-1.5">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              i < activeIndex ? "bg-teal-700 text-white" : i === activeIndex ? "bg-amber-500 text-white" : "bg-stone-200 text-stone-500"
            }`}
          >
            {i < activeIndex ? <Check size={12} /> : <span>{i + 1}</span>}
            <span className="hidden sm:inline">{s}</span>
          </div>
          {i < steps.length - 1 && <div className={`w-4 h-0.5 ${i < activeIndex ? "bg-teal-700" : "bg-stone-200"}`} />}
        </div>
      ))}
    </div>
  );
}
