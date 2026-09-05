"use client";

import { useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Card } from "@/components/shared/Primitives";
import FloatingNav from "@/components/shared/FloatingNav";
import { useMediKioskStore } from "@/lib/data/store";

const VOLUME_DATA = [
  { day: "Mon", patients: 210 }, { day: "Tue", patients: 232 }, { day: "Wed", patients: 198 },
  { day: "Thu", patients: 247 }, { day: "Fri", patients: 260 }, { day: "Sat", patients: 175 },
];
const INTAKE_TIME_DATA = [
  { day: "Mon", minutes: 7.8 }, { day: "Tue", minutes: 7.1 }, { day: "Wed", minutes: 6.9 },
  { day: "Thu", minutes: 6.7 }, { day: "Fri", minutes: 6.4 }, { day: "Sat", minutes: 6.7 },
];

export default function AdminPage() {
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

  const stats = [
    { label: "Patients Today", value: "247" },
    { label: "Average Intake", value: "6m 42s" },
    { label: "Documents Processed", value: "384" },
    { label: "Summaries Ready", value: String(queue.filter((q) => q.aiStatus === "ready").length) },
    { label: "Priority Alerts", value: String(queue.filter((q) => q.redFlag.triggered).length) },
  ];

  return (
    <div className="min-h-screen bg-stone-50 p-6 lg:p-10">
      <FloatingNav />
      <div className="font-serif-display text-2xl font-semibold text-teal-900 mb-6">Admin Analytics</div>
      <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <div className="text-2xl font-semibold text-teal-800">{s.value}</div>
            <div className="text-xs text-stone-400 mt-1">{s.label}</div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="font-semibold text-sm text-stone-700 mb-4">Patients processed this week</div>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={VOLUME_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="patients" fill="#0f766e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <div className="font-semibold text-sm text-stone-700 mb-4">Average intake time (minutes)</div>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={INTAKE_TIME_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="minutes" stroke="#d97706" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
