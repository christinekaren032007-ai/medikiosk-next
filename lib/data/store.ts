"use client";

import { create } from "zustand";
import { AyushAssessment, ComplaintCategory, FamilyHistoryEntry, FollowUpQA, FollowUpQuestion } from "@/types/clinical";
import { DraftPatient, PatientRecord } from "@/types/patient";
import { Consultation } from "@/types/ai";
import { Lang } from "@/lib/i18n/translations";
import { CHIEF_COMPLAINTS } from "@/lib/ai/historyEngine";
import { mockExtractDocument } from "@/lib/ai/documentEngine";
import { uid } from "@/lib/utils/id";

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

/**
 * Builds the same shape the server would have created for a new draft,
 * entirely client-side. Used as a fallback so the kiosk demo can run start
 * to finish without a reachable backend — never as a substitute when the
 * backend IS available.
 */
function buildLocalDraft(category: ComplaintCategory, identity: PendingIdentity | null): DraftPatient {
  return {
    id: uid(),
    name: identity?.name ?? "Guest Patient",
    age: identity?.age ?? "—",
    gender: identity?.gender ?? "—",
    abhaId: identity?.abhaId ?? null,
    chiefComplaintCategory: category,
    chiefComplaintLabel: CHIEF_COMPLAINTS.find((c) => c.key === category)?.label || category,
    answers: {},
    documents: [],
    docProcessingStage: null,
  };
}

interface MediKioskState {
  sessionId: string | null;
  hydrated: boolean;
  initError: string | null;
  // True once any step of the demo has had to fall back to local,
  // clearly-labelled demo data because the backend was unreachable.
  offlineMode: boolean;
  lang: Lang;
  ayushMode: boolean;
  queue: PatientRecord[];
  draft: DraftPatient | null;
  lastToken: string | null;
  lastConsultationId: string | null;

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
  initError: null,
  offlineMode: false,
  lang: "en",
  ayushMode: false,
  queue: [],
  draft: null,
  lastToken: null,
  lastConsultationId: null,

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
    // Every patient-flow page gates its render on `hydrated`, so this must
    // always resolve to true — even when the session call fails — or the
    // whole kiosk is stuck blank forever with no way to recover.
    try {
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
        initError: null,
      });
    } catch (err) {
      set({
        sessionId,
        hydrated: true,
        initError: err instanceof Error ? err.message : "Could not connect to the server.",
      });
    }
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
    const { pendingIdentity, visitType, previousRecordUsed } = get();
    const identityPatch = pendingIdentity || visitType
      ? {
          ...(pendingIdentity || {}),
          returningPatient: visitType === "returning",
          previousRecordUsed: visitType === "returning" ? previousRecordUsed : false,
        }
      : null;

    // Never let a broken/unreachable backend stall the demo on a dead
    // button click — fall back to an equivalent local draft so the patient
    // flow always continues, clearly marked as offline/demo data.
    if (!sessionId) {
      set({ draft: buildLocalDraft(category, pendingIdentity), offlineMode: true });
      return;
    }
    try {
      const data = await api<{ draft: DraftPatient }>(`/api/session/${sessionId}/draft`, {
        method: "POST",
        body: JSON.stringify({ category }),
      });
      let draft = data.draft;
      if (identityPatch) {
        const patched = await api<{ draft: DraftPatient }>(`/api/session/${sessionId}/draft`, {
          method: "PATCH",
          body: JSON.stringify(identityPatch),
        });
        draft = patched.draft;
      }
      set({ draft });
    } catch {
      set({ draft: { ...buildLocalDraft(category, pendingIdentity), ...identityPatch }, offlineMode: true });
    }
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
    // Saves progress to the backend as a convenience — the in-memory draft
    // already has every answer, so a failed save here must never block
    // the patient from moving on to the next question.
    const { sessionId, draft } = get();
    if (!sessionId || !draft) return;
    try {
      await api(`/api/session/${sessionId}/draft`, { method: "PATCH", body: JSON.stringify({ answers: draft.answers }) });
    } catch {
      set({ offlineMode: true });
    }
  },

  finishDocProcessing: async () => {
    const { sessionId, draft } = get();
    if (!sessionId || !draft) return;
    try {
      const data = await api<{ draft: DraftPatient }>(`/api/session/${sessionId}/draft/finish-doc-processing`, { method: "POST" });
      set({ draft: data.draft });
    } catch {
      set({ draft: { ...draft, documents: [mockExtractDocument(draft.chiefComplaintCategory)], docProcessingStage: "done" }, offlineMode: true });
    }
  },

  submitDraft: async () => {
    const sessionId = get().sessionId;
    if (!sessionId) return "";
    try {
      const data = await api<{ token: string; consultationId: string }>(`/api/session/${sessionId}/submit`, { method: "POST" });
      set({ draft: null, lastToken: data.token, lastConsultationId: data.consultationId, visitType: null, pendingIdentity: null, previousRecordUsed: false });
      return data.token;
    } catch {
      // No reachable database to actually queue the patient for a doctor —
      // but the patient's own demo must still be able to finish. The
      // DEMO- prefix keeps this visibly distinct from a real queue token.
      const demoToken = `DEMO-${uid().slice(0, 4).toUpperCase()}`;
      set({ draft: null, lastToken: demoToken, lastConsultationId: null, visitType: null, pendingIdentity: null, previousRecordUsed: false, offlineMode: true });
      return demoToken;
    }
  },

  resetDraft: async () => {
    const sessionId = get().sessionId;
    set({ draft: null, visitType: null, pendingIdentity: null, previousRecordUsed: false });
    if (sessionId) {
      try {
        await api(`/api/session/${sessionId}/draft`, { method: "DELETE" });
      } catch {
        set({ offlineMode: true });
      }
    }
  },

  setFamilyHistory: async (entries, noFamilyHistory) => {
    set((s) => (s.draft ? { draft: { ...s.draft, familyHistory: entries, noFamilyHistory } } : {}));
    const sessionId = get().sessionId;
    if (sessionId) {
      try {
        await api(`/api/session/${sessionId}/draft`, { method: "PATCH", body: JSON.stringify({ familyHistory: entries, noFamilyHistory }) });
      } catch {
        set({ offlineMode: true });
      }
    }
  },

  setAyushAssessment: async (assessment) => {
    set((s) => (s.draft ? { draft: { ...s.draft, ayushAssessment: assessment } } : {}));
    const sessionId = get().sessionId;
    if (sessionId) {
      try {
        await api(`/api/session/${sessionId}/draft`, { method: "PATCH", body: JSON.stringify({ ayushAssessment: assessment }) });
      } catch {
        set({ offlineMode: true });
      }
    }
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
    if (sessionId) {
      try {
        await api(`/api/session/${sessionId}/draft`, { method: "PATCH", body: JSON.stringify({ aiFollowUp }) });
      } catch {
        set({ offlineMode: true });
      }
    }
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
      lastConsultationId: null,
      ayushMode: false,
      lang: "en",
      visitType: null,
      pendingIdentity: null,
      previousRecordUsed: false,
      offlineMode: false,
    });
  },
}));
