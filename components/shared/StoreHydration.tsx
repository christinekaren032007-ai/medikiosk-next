"use client";

import { useEffect } from "react";
import { useRaphaStore } from "@/lib/data/store";

export default function StoreHydration() {
  useEffect(() => {
    useRaphaStore.getState().initSession();
  }, []);
  return null;
}
