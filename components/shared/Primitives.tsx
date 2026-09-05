"use client";

import { HTMLAttributes, ReactNode } from "react";

export function Card({ children, className = "", ...rest }: { children: ReactNode; className?: string } & HTMLAttributes<HTMLDivElement>) {
  return <div className={`bg-white rounded-2xl border border-stone-200 shadow-sm ${className}`} {...rest}>{children}</div>;
}

type Tone = "stone" | "teal" | "amber" | "rose" | "emerald";
const tones: Record<Tone, string> = {
  stone: "bg-stone-100 text-stone-700",
  teal: "bg-teal-50 text-teal-700",
  amber: "bg-amber-50 text-amber-700",
  rose: "bg-rose-50 text-rose-700",
  emerald: "bg-emerald-50 text-emerald-700",
};

export function Badge({ children, tone = "stone" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${tones[tone]}`}>{children}</span>;
}

export function ChipButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`text-left px-4 py-3 rounded-xl border-2 font-medium text-[15px] transition-colors ${
        selected ? "border-teal-700 bg-teal-50 text-teal-900" : "border-stone-200 bg-white text-stone-700 hover:border-teal-300"
      }`}
    >
      {children}
    </button>
  );
}
