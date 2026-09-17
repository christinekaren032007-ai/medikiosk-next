"use client";

import { AlertTriangle } from "lucide-react";
import { useMediKioskStore } from "@/lib/data/store";

export default function BackendErrorBanner() {
  const backendError = useMediKioskStore((s) => s.backendError);
  const initError = useMediKioskStore((s) => s.initError);
  const message = backendError || initError;
  if (!message) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-red-600 text-white text-sm px-4 py-2 flex items-center justify-center gap-2 shadow">
      <AlertTriangle size={16} />
      <span>{message}</span>
    </div>
  );
}
