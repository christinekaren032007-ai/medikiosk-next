"use client";

import { create } from "zustand";
import { AyushAssessment, ComplaintCategory, FamilyHistoryEntry, FollowUpQA, FollowUpQuestion } from "@/types/clinical";
import { DraftPatient, PatientRecord } from "@/types/patient";
import { Consultation } from "@/types/ai";
import { Lang } from "@/lib/i18n/translations";

export type VisitType = "new" | "returning" | null;
export interface PendingIdentity {
  name: string;
  age: number | "—";
  gender: "Male" | "Female" | "—";
  abhaId: string | null;
}

async function api<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(`${init?.method || "GET"} ${url} failed: ${res.status}`);
  return res.json();
}

interface MediKioskState {
  sessionId: string | null;
  hydrated: boolean;
  lang: Lang;
  ayushMode: boolean;
  queue: PatientRecord[];
  draft: DraftPatient | null;
  lastToken: string | null;
  lastPatientId: string | null;

  // Pre-draft kiosk flow state: captured before a complaint is chosen (and
  // therefore before a draft exists), then folded into the draft once
  // startPatient() creates it.
  visitType: VisitType;
  pendingIdentity: PendingIdentity | null;
  previousRecordUsed: boolean;
  setVisitType: (v: VisitType) => void;
  setPendingIdentity: (i: PendingIdentity) => void;
  setPreviousRecordUsed: (used: boolean) => void;

  initSession: () => Promise<void>;
  setLang: (lang: Lang) => void;
  toggleAyush: () => void;

  startPatient: (category: ComplaintCategory) => Promise<void>;
  setIdentity: (name: string, age: number, gender: "Male" | "Female", abhaId: string | null) => void;
  answerField: (fieldId: string, value: string | string[] | number) => void;
  syncDraft: () => Promise<void>;
  finishDocProcessing: () => Promise<void>;
  submitDraft: () => Promise<string>;
  resetDraft: () => Promise<void>;

  setFamilyHistory: (entries: FamilyHistoryEntry[], noFamilyHistory: boolean) => Promise<void>;
  setAyushAssessment: (assessment: AyushAssessment) => Promise<void>;
  fetchFollowUpQuestion: () => Promise<FollowUpQuestion | null>;
  answerFollowUp: (question: string, answer: string) => Promise<void>;

  loadScenario: (key: "chest_pain" | "fever" | "diabetes" | "ayush") => Promise<void>;

  fetchQueue: () => Promise<void>;
  confirmSummary: (patientId: string) => Promise<void>;
  regenerateSummary: (patientId: string) => Promise<void>;
  saveConsultation: (patientId: string, consultation: Omit<Consultation, "completedAt">) => Promise<void>;

  resetDemo: () => Promise<void>;
}

export const useMediKioskStore = create<MediKioskState>()((set, get) => ({
  sessionId: null,
  hydrated: false,
  lang: "en",
  ayushMode: false,
  queue: [],
  draft: null,
  lastToken: null,
  lastPatientId: null,

  visitType: null,
  pendingIdentity: null,
  previousRecordUsed: false,
  setVisitType: (v) => set({ visitType: v }),
  setPendingIdentity: (i) => set({ pendingIdentity: i }),
  setPreviousRecordUsed: (used) => set({ previousRecordUsed: used }),

  initSession: async () => {
    let sessionId = typeof window !== "undefined" ? localStorage.getItem("mk_session_id") : null;
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      if (typeof window !== "undefined") localStorage.setItem("mk_session_id", sessionId);
    }
    const data = await api<{ sessionId: string; lang: Lang; ayushMode: boolean; draft: DraftPatient | null; lastToken: string | null }>(
      "/api/session",
      { method: "POST", body: JSON.stringify({ sessionId }) }
    );
    set({
      sessionId: data.sessionId,
      lang: data.lang,
      ayushMode: data.ayushMode,
      draft: data.draft,
      lastToken: data.lastToken,
      hydrated: true,
    });
  },

  setLang: (lang) => {
    set({ lang });
    const sessionId = get().sessionId;
    if (sessionId) api(`/api/session/${sessionId}`, { method: "PATCH", body: JSON.stringify({ lang }) }).catch(() => {});
  },

  toggleAyush: () => {
    const ayushMode = !get().ayushMode;
    set({ ayushMode });
    const sessionId = get().sessionId;
    if (sessionId) api(`/api/session/${sessionId}`, { method: "PATCH", body: JSON.stringify({ ayushMode }) }).catch(() => {});
  },

  startPatient: async (category) => {
    const sessionId = get().sessionId;
    if (!sessionId) return;
    const data = await api<{ draft: DraftPatient }>(`/api/session/${sessionId}/draft`, {
      method: "POST",
      body: JSON.stringify({ category }),
    });
    let draft = data.draft;

    // Fold in whatever the pre-draft welcome/visit-type/previous-records
    // screens already captured, now that a draft exists to attach it to.
    const { pendingIdentity, visitType, previousRecordUsed } = get();
    if (pendingIdentity || visitType) {
      const patch = {
        ...(pendingIdentity || {}),
        returningPatient: visitType === "returning",
        previousRecordUsed: visitType === "returning" ? previousRecordUsed : false,
      };
      const patched = await api<{ draft: DraftPatient }>(`/api/session/${sessionId}/draft`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      draft = patched.draft;
    }
    set({ draft });
  },

  setIdentity: (name, age, gender, abhaId) => {
    set((s) => (s.draft ? { draft: { ...s.draft, name, age, gender, abhaId } } : {}));
    const sessionId = get().sessionId;
    if (sessionId) api(`/api/session/${sessionId}/draft`, { method: "PATCH", body: JSON.stringify({ name, age, gender, abhaId }) }).catch(() => {});
  },

  answerField: (fieldId, value) => {
    set((s) => (s.draft ? { draft: { ...s.draft, answers: { ...s.draft.answers, [fieldId]: value } } } : {}));
  },

  syncDraft: async () => {
    const { sessionId, draft } = get();
    if (!sessionId || !draft) return;
    await api(`/api/session/${sessionId}/draft`, { method: "PATCH", body: JSON.stringify({ answers: draft.answers }) });
  },

  finishDocProcessing: async () => {
    const sessionId = get().sessionId;
    if (!sessionId) return;
    const data = await api<{ draft: DraftPatient }>(`/api/session/${sessionId}/draft/finish-doc-processing`, { method: "POST" });
    set({ draft: data.draft });
  },

  submitDraft: async () => {
    const sessionId = get().sessionId;
    if (!sessionId) return "";
    const data = await api<{ token: string; patientId: string }>(`/api/session/${sessionId}/submit`, { method: "POST" });
    set({ draft: null, lastToken: data.token, lastPatientId: data.patientId, visitType: null, pendingIdentity: null, previousRecordUsed: false });
    return data.token;
  },

  resetDraft: async () => {
    const sessionId = get().sessionId;
    set({ draft: null, visitType: null, pendingIdentity: null, previousRecordUsed: false });
    if (sessionId) await api(`/api/session/${sessionId}/draft`, { method: "DELETE" });
  },

  setFamilyHistory: async (entries, noFamilyHistory) => {
    set((s) => (s.draft ? { draft: { ...s.draft, familyHistory: entries, noFamilyHistory } } : {}));
    const sessionId = get().sessionId;
    if (sessionId) await api(`/api/session/${sessionId}/draft`, { method: "PATCH", body: JSON.stringify({ familyHistory: entries, noFamilyHistory }) });
  },

  setAyushAssessment: async (assessment) => {
    set((s) => (s.draft ? { draft: { ...s.draft, ayushAssessment: assessment } } : {}));
    const sessionId = get().sessionId;
    if (sessionId) await api(`/api/session/${sessionId}/draft`, { method: "PATCH", body: JSON.stringify({ ayushAssessment: assessment }) });
  },

  fetchFollowUpQuestion: async () => {
    const draft = get().draft;
    if (!draft) return null;
    try {
      const data = await api<{ result: FollowUpQuestion | null }>("/api/ai/follow-up", {
        method: "POST",
        body: JSON.stringify({
          chiefComplaintLabel: draft.chiefComplaintLabel,
          answers: draft.answers,
          priorFollowUp: draft.aiFollowUp || [],
          familyHistory: draft.familyHistory,
          noFamilyHistory: draft.noFamilyHistory,
        }),
      });
      return data.result;
    } catch {
      return null;
    }
  },

  answerFollowUp: async (question, answer) => {
    const draft = get().draft;
    if (!draft) return;
    const aiFollowUp: FollowUpQA[] = [...(draft.aiFollowUp || []), { question, answer }];
    set({ draft: { ...draft, aiFollowUp } });
    const sessionId = get().sessionId;
    if (sessionId) await api(`/api/session/${sessionId}/draft`, { method: "PATCH", body: JSON.stringify({ aiFollowUp }) });
  },

  loadScenario: async (key) => {
    const sessionId = get().sessionId;
    if (!sessionId) return;
    const data = await api<{ draft: DraftPatient; ayushMode: boolean }>(`/api/session/${sessionId}/draft/scenario`, {
      method: "POST",
      body: JSON.stringify({ key }),
    });
    set({ draft: data.draft, ayushMode: data.ayushMode, visitType: null, pendingIdentity: null, previousRecordUsed: false });
  },

  fetchQueue: async () => {
    const data = await api<{ queue: PatientRecord[] }>("/api/patients");
    set({ queue: data.queue });
  },

  confirmSummary: async (patientId) => {
    await api(`/api/patients/${patientId}/confirm-summary`, { method: "PATCH" });
    await get().fetchQueue();
  },

  regenerateSummary: async (patientId) => {
    await api(`/api/patients/${patientId}/regenerate-summary`, { method: "POST" });
    await get().fetchQueue();
  },

  saveConsultation: async (patientId, consultation) => {
    await api(`/api/patients/${patientId}/consultation`, { method: "PATCH", body: JSON.stringify(consultation) });
  },

  resetDemo: async () => {
    const sessionId = get().sessionId;
    const data = await api<{ queue: PatientRecord[] }>("/api/dev/reset", {
      method: "POST",
      body: JSON.stringify({ sessionId }),
    });
    set({
      queue: data.queue,
      draft: null,
      lastToken: null,
      lastPatientId: null,
      ayushMode: false,
      lang: "en",
      visitType: null,
      pendingIdentity: null,
      previousRecordUsed: false,
    });
  },
}));
