"use client";

import { create } from "zustand";
import { ComplaintKey, FamilyHistoryEntry, FollowUpQA, FollowUpQuestion } from "@/types/clinical";
import { DraftPatient, PatientRecord } from "@/types/patient";
import { Consultation, TreatmentFollowup } from "@/types/ai";
import { DocumentRecord } from "@/types/document";
import { Lang } from "@/lib/i18n/translations";

async function api<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(`${init?.method || "GET"} ${url} failed: ${res.status}`);
  return res.json();
}

interface RaphaState {
  sessionId: string | null;
  hydrated: boolean;
  lang: Lang;
  queue: PatientRecord[];
  draft: DraftPatient | null;
  lastToken: string | null;

  initSession: () => Promise<void>;
  setLang: (lang: Lang) => void;

  startPatient: (categories: ComplaintKey[], otherText?: string) => Promise<void>;
  setIdentity: (name: string, age: number, gender: "Male" | "Female", abhaId: string | null) => void;
  answerField: (fieldId: string, value: string | string[] | number) => void;
  syncDraft: () => Promise<void>;
  addDocument: (document: DocumentRecord) => Promise<void>;
  submitDraft: () => Promise<string>;
  resetDraft: () => Promise<void>;

  setFamilyHistory: (entries: FamilyHistoryEntry[], noFamilyHistory: boolean) => Promise<void>;
  fetchFollowUpQuestion: () => Promise<FollowUpQuestion | null>;
  answerFollowUp: (q: FollowUpQuestion, answer: string) => Promise<void>;

  loadScenario: (key: "fever" | "joint_pain" | "digestive" | "headache") => Promise<void>;

  fetchQueue: () => Promise<void>;
  confirmCaseSheet: (patientId: string) => Promise<void>;
  regenerateCaseSheet: (patientId: string) => Promise<void>;
  saveConsultation: (patientId: string, consultation: Omit<Consultation, "completedAt">) => Promise<void>;
  addTreatmentFollowup: (patientId: string, followup: Omit<TreatmentFollowup, "id" | "date">) => Promise<void>;

  resetDemo: () => Promise<void>;
}

export const useRaphaStore = create<RaphaState>()((set, get) => ({
  sessionId: null,
  hydrated: false,
  lang: "en",
  queue: [],
  draft: null,
  lastToken: null,

  initSession: async () => {
    let sessionId = typeof window !== "undefined" ? localStorage.getItem("rapha_session_id") : null;
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      if (typeof window !== "undefined") localStorage.setItem("rapha_session_id", sessionId);
    }
    const data = await api<{ sessionId: string; lang: Lang; draft: DraftPatient | null; lastToken: string | null }>(
      "/api/session",
      { method: "POST", body: JSON.stringify({ sessionId }) }
    );
    set({
      sessionId: data.sessionId,
      lang: data.lang,
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

  startPatient: async (categories, otherText) => {
    const sessionId = get().sessionId;
    if (!sessionId) return;
    const data = await api<{ draft: DraftPatient }>(`/api/session/${sessionId}/draft`, {
      method: "POST",
      body: JSON.stringify({ categories, otherText }),
    });
    set({ draft: data.draft });
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

  addDocument: async (document) => {
    const sessionId = get().sessionId;
    if (!sessionId) return;
    const data = await api<{ draft: DraftPatient }>(`/api/session/${sessionId}/draft/finish-doc-processing`, {
      method: "POST",
      body: JSON.stringify({ document }),
    });
    set({ draft: data.draft });
  },

  submitDraft: async () => {
    const sessionId = get().sessionId;
    if (!sessionId) return "";
    const data = await api<{ token: string }>(`/api/session/${sessionId}/submit`, { method: "POST" });
    set({ draft: null, lastToken: data.token });
    return data.token;
  },

  resetDraft: async () => {
    const sessionId = get().sessionId;
    set({ draft: null });
    if (sessionId) await api(`/api/session/${sessionId}/draft`, { method: "DELETE" });
  },

  setFamilyHistory: async (entries, noFamilyHistory) => {
    set((s) => (s.draft ? { draft: { ...s.draft, familyHistory: entries, noFamilyHistory } } : {}));
    const sessionId = get().sessionId;
    if (sessionId) await api(`/api/session/${sessionId}/draft`, { method: "PATCH", body: JSON.stringify({ familyHistory: entries, noFamilyHistory }) });
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

  answerFollowUp: async (q, answer) => {
    const draft = get().draft;
    if (!draft) return;
    const aiFollowUp: FollowUpQA[] = [...(draft.aiFollowUp || []), { question: q.question, answer, type: q.type, section: q.section, reason: q.reason }];
    set({ draft: { ...draft, aiFollowUp } });
    const sessionId = get().sessionId;
    if (sessionId) await api(`/api/session/${sessionId}/draft`, { method: "PATCH", body: JSON.stringify({ aiFollowUp }) });
  },

  loadScenario: async (key) => {
    const sessionId = get().sessionId;
    if (!sessionId) return;
    const data = await api<{ draft: DraftPatient }>(`/api/session/${sessionId}/draft/scenario`, {
      method: "POST",
      body: JSON.stringify({ key }),
    });
    set({ draft: data.draft });
  },

  fetchQueue: async () => {
    const data = await api<{ queue: PatientRecord[] }>("/api/patients");
    set({ queue: data.queue });
  },

  confirmCaseSheet: async (patientId) => {
    await api(`/api/patients/${patientId}/confirm-summary`, { method: "PATCH" });
    await get().fetchQueue();
  },

  regenerateCaseSheet: async (patientId) => {
    await api(`/api/patients/${patientId}/regenerate-summary`, { method: "POST" });
    await get().fetchQueue();
  },

  saveConsultation: async (patientId, consultation) => {
    await api(`/api/patients/${patientId}/consultation`, { method: "PATCH", body: JSON.stringify(consultation) });
  },

  addTreatmentFollowup: async (patientId, followup) => {
    await api(`/api/patients/${patientId}/followup`, { method: "POST", body: JSON.stringify(followup) });
    await get().fetchQueue();
  },

  resetDemo: async () => {
    const sessionId = get().sessionId;
    const data = await api<{ queue: PatientRecord[] }>("/api/dev/reset", {
      method: "POST",
      body: JSON.stringify({ sessionId }),
    });
    set({ queue: data.queue, draft: null, lastToken: null, lang: "en" });
  },
}));
