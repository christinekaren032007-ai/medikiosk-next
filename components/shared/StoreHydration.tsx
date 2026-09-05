"use client";

import { useEffect } from "react";
import { useMediKioskStore } from "@/lib/data/store";

export default function StoreHydration() {
  useEffect(() => {
    useMediKioskStore.persist.rehydrate();
    // give rehydrate a tick, then seed if this is genuinely the first run
    const t = setTimeout(() => {
      useMediKioskStore.getState().ensureSeeded();
    }, 0);
    return () => clearTimeout(t);
  }, []);
  return null;
}
