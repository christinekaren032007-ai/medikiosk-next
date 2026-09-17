"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, ShieldCheck, BarChart3, Search, Bell } from "lucide-react";
import { Card, Badge } from "@/components/shared/Primitives";
import FloatingNav from "@/components/shared/FloatingNav";
import { useMediKioskStore } from "@/lib/data/store";

export default function DoctorDashboardPage() {
  const router = useRouter();
  const queue = useMediKioskStore((s) => s.queue);
  const fetchQueue = useMediKioskStore((s) => s.fetchQueue);

  useEffect(() => {
    fetchQueue();
    const iv = setInterval(fetchQueue, 5000);
    window.addEventListener("focus", fetchQueue);
    return () => {
      clearInterval(iv);
      window.removeEventListener("focus", fetchQueue);
    };
  }, [fetchQueue]);

  return (
    <div className="min-h-screen bg-stone-50 flex">
      <FloatingNav />
      <div className="w-56 bg-white border-r border-stone-200 p-5 hidden md:block">
        <div className="font-serif-display text-xl font-semibold text-teal-900 mb-1">Rapha</div>
        <div className="text-xs text-stone-400 mb-8">Doctor Dashboard</div>
        <div className="space-y-1">
          <div className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium bg-teal-50 text-teal-800">
            <LayoutDashboard size={16} /> Dashboard
          </div>
          <button onClick={() => router.push("/admin")} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-stone-500 hover:bg-stone-50">
            <BarChart3 size={16} /> Analytics
          </button>
          <div className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-stone-300">
            <ShieldCheck size={16} /> Settings (not wired in this prototype)
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-6 max-w-4xl">
          <div className="flex-1 flex items-center gap-2 bg-white border border-stone-200 rounded-xl px-3 py-2">
            <Search size={15} className="text-stone-400" /><span className="text-sm text-stone-400">Search patient…</span>
          </div>
          <Bell size={18} className="text-stone-400" />
          <div className="w-9 h-9 rounded-full bg-teal-700 text-white flex items-center justify-center text-xs font-semibold">Dr</div>
        </div>

        <Card className="overflow-hidden">
          <div className="p-5 border-b border-stone-100 font-semibold text-stone-800">Patient Queue</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-stone-400 border-b border-stone-100">
                <th className="p-4">Token</th><th>Patient</th><th>Age</th><th>Chief Complaint</th><th>AI Status</th><th>Visit</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((p) => (
                <tr key={p.id} onClick={() => router.push(`/doctor/patient/${p.id}`)} className="border-b border-stone-50 hover:bg-teal-50/40 cursor-pointer">
                  <td className="p-4 font-semibold text-teal-800">{p.token}</td>
                  <td>{p.name}</td>
                  <td>{p.age}</td>
                  <td>{p.history.chiefComplaintLabel}</td>
                  <td><Badge tone={p.aiStatus === "ready" ? "emerald" : "stone"}>{p.aiStatus === "ready" ? "Ready" : "Processing"}</Badge></td>
                  <td><Badge tone="stone">{p.history.returningPatient ? "Returning" : "New"}</Badge></td>
                  <td>{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
