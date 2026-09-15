"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, ShieldCheck, BarChart3, Search, Bell } from "lucide-react";
import { Card, Badge } from "@/components/shared/Primitives";
import FloatingNav from "@/components/shared/FloatingNav";
import { useRaphaStore } from "@/lib/data/store";
import { computeCasePreparation } from "@/lib/ai/casePreparation";

export default function DoctorDashboardPage() {
  const router = useRouter();
  const queue = useRaphaStore((s) => s.queue);
  const fetchQueue = useRaphaStore((s) => s.fetchQueue);

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
        <div className="text-xs text-stone-400 mb-8">Practitioner Dashboard</div>
        <div className="space-y-1">
          <div className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium bg-teal-50 text-teal-800">
            <LayoutDashboard size={16} /> Case List
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
          <div className="p-5 border-b border-stone-100 font-semibold text-stone-800">Patient Case List</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-stone-400 border-b border-stone-100">
                  <th className="p-4">Token</th><th>Patient</th><th>Age</th><th>Chief Complaint</th><th>AI Status</th><th>Case Preparation</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((p) => {
                  const prep = computeCasePreparation(p.history, p.documents);
                  return (
                    <tr key={p.id} onClick={() => router.push(`/doctor/patient/${p.id}`)} className="border-b border-stone-50 hover:bg-teal-50/40 cursor-pointer">
                      <td className="p-4 font-semibold text-teal-800">{p.token}</td>
                      <td>{p.name}</td>
                      <td>{p.age}</td>
                      <td>{p.history.chiefComplaintLabel}</td>
                      <td><Badge tone={p.aiStatus === "ready" ? "emerald" : "stone"}>{p.aiStatus === "ready" ? "Ready" : "Processing"}</Badge></td>
                      <td>
                        <div className="flex items-center gap-2 w-32">
                          <div className="h-1.5 flex-1 bg-stone-100 rounded-full overflow-hidden">
                            <div className="h-full bg-teal-600 rounded-full" style={{ width: `${prep.percent}%` }} />
                          </div>
                          <span className="text-xs text-stone-500">{prep.percent}%</span>
                        </div>
                      </td>
                      <td>{p.status}</td>
                    </tr>
                  );
                })}
                {queue.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-sm text-stone-400">No patients in the case list yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
