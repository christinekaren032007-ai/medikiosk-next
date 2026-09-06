"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Stethoscope } from "lucide-react";
import { Card } from "@/components/shared/Primitives";
import Button from "@/components/shared/Button";

export default function DoctorLoginPage() {
  return (
    <Suspense fallback={null}>
      <DoctorLoginForm />
    </Suspense>
  );
}

function DoctorLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/doctor-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Incorrect password.");
      return;
    }
    router.push(searchParams.get("next") || "/doctor");
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <Card className="p-8 max-w-sm w-full">
        <div className="w-14 h-14 rounded-2xl bg-teal-700 flex items-center justify-center mx-auto mb-5">
          <Stethoscope size={24} className="text-white" />
        </div>
        <h1 className="font-serif-display text-xl font-semibold text-teal-900 text-center mb-1">Doctor Access</h1>
        <p className="text-sm text-stone-500 text-center mb-6">Enter the shared password to open the doctor dashboard.</p>
        <form onSubmit={submit} className="space-y-4">
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              className="w-full pl-9 pr-3 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-teal-400"
            />
          </div>
          {error && <div className="text-sm text-rose-600">{error}</div>}
          <Button type="submit" disabled={loading || !password} className="w-full">
            {loading ? "Checking…" : "Enter"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
