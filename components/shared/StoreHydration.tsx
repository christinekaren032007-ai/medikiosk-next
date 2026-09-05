"use client";

import { useEffect } from "react";
import { useMediKioskStore } from "@/lib/data/store";

export default function StoreHydration() {
  useEffect(() => {
    useMediKioskStore.getState().initSession();
  }, []);
  return null;
}
