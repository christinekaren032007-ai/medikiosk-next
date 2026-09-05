"use client";

import { useRouter, usePathname } from "next/navigation";

export default function FloatingNav() {
  const router = useRouter();
  const pathname = usePathname();
  const inPatient = pathname?.startsWith("/patient");
  const inDoctor = pathname?.startsWith("/doctor");

  return (
    <div className="fixed top-4 right-4 z-50 flex gap-2">
      <button onClick={() => router.push("/")} className="bg-white/95 backdrop-blur border border-stone-200 shadow-sm rounded-full px-3 py-2 text-xs font-semibold text-stone-600 hover:text-teal-700">
        Home
      </button>
      <button
        onClick={() => router.push("/patient")}
        className={`rounded-full px-3 py-2 text-xs font-semibold shadow-sm border ${inPatient ? "bg-teal-700 text-white border-teal-700" : "bg-white/95 border-stone-200 text-stone-600 hover:text-teal-700"}`}
      >
        Patient Kiosk
      </button>
      <button
        onClick={() => router.push("/doctor")}
        className={`rounded-full px-3 py-2 text-xs font-semibold shadow-sm border ${inDoctor ? "bg-teal-700 text-white border-teal-700" : "bg-white/95 border-stone-200 text-stone-600 hover:text-teal-700"}`}
      >
        Doctor Dashboard
      </button>
    </div>
  );
}
