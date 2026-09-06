"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, FileWarning, ShieldCheck, BarChart3, Search, Bell, AlertTriangle } from "lucide-react";
import { Card, Badge } from "@/components/shared/Primitives";
import Button from "@/components/shared/Button";
import FloatingNav from "@/components/shared/FloatingNav";
import { useMediKioskStore } from "@/lib/data/store";

export default function DoctorDashboardPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"dashboard" | "alerts">("dashboard");
  const queue = useMediKioskStore((s) => s.queue);
  const fetchQueue = useMediKioskStore((s) => s.fetchQueue);
  const alerts = queue.filter((p) => p.redFlag.triggered);

  useEffect(() => {
    fetchQueue();
    const iv = setInterval(fetchQueue, 5000);
    window.addEventListener("focus", fetchQueue);
    return () => {
      clearInterval(iv);
      window.removeEventListener("focus", fetchQueue);
    };
  }, [fetchQueue]);

  const nav = [
    { key: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
    { key: "alerts" as const, label: "Priority Alerts", icon: FileWarning },
  ];

  return (
    <div className="min-h-screen bg-stone-50 flex">
      <FloatingNav />
      <div className="w-56 bg-white border-r border-stone-200 p-5 hidden md:block">
        <div className="font-serif-display text-xl font-semibold text-teal-900 mb-1">Rapha</div>
        <div className="text-xs text-stone-400 mb-8">Doctor Dashboard</div>
        <div className="space-y-1">
          {nav.map((n) => (
            <button
              key={n.key}
              onClick={() => setTab(n.key)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium ${tab === n.key ? "bg-teal-50 text-teal-800" : "text-stone-500 hover:bg-stone-50"}`}
            >
              <n.icon size={16} /> {n.label}
              {n.key === "alerts" && alerts.length > 0 && <span className="ml-auto bg-rose-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center">{alerts.length}</span>}
            </button>
          ))}
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

        {tab === "dashboard" && (
          <Card className="overflow-hidden">
            <div className="p-5 border-b border-stone-100 font-semibold text-stone-800">Patient Queue</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-stone-400 border-b border-stone-100">
                  <th className="p-4">Token</th><th>Patient</th><th>Age</th><th>Chief Complaint</th><th>AI Status</th><th>Priority</th><th>Status</th>
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
                    <td>{p.priority === "high" ? <Badge tone="rose">🔴 Priority</Badge> : <Badge tone="stone">Normal</Badge>}</td>
                    <td>{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {tab === "alerts" && (
          <div className="space-y-4 max-w-2xl">
            {alerts.length === 0 && <Card className="p-8 text-center text-sm text-stone-400">No priority alerts right now.</Card>}
            {alerts.map((p) => (
              <Card key={p.id} className="p-5 border-l-4 border-l-rose-500">
                <div className="flex items-center gap-2 text-rose-600 font-semibold text-sm mb-2"><AlertTriangle size={16} /> HIGH PRIORITY</div>
                <div className="font-semibold text-stone-800 mb-1">{p.name}</div>
                <div className="text-sm text-stone-500 mb-3">{p.redFlag.reason}</div>
                <p className="text-xs text-stone-400 mb-4">Possible emergency symptoms reported during intake. This is a simulation only — Rapha does not diagnose patients.</p>
                <Button variant="danger" onClick={() => router.push(`/doctor/patient/${p.id}`)}>Open Patient</Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
