"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { ComplaintCategory } from "@/types/clinical";
import { DraftPatient, PatientRecord } from "@/types/patient";
import { DocumentRecord, ProcessingStage } from "@/types/document";
import { Lang } from "@/lib/i18n/translations";
import { CHIEF_COMPLAINTS } from "@/lib/ai/historyEngine";
import { mockExtractDocument } from "@/lib/ai/documentEngine";
import { buildSummary } from "@/lib/ai/summaryEngine";
import { evaluateRedFlag } from "@/lib/ai/redFlagEngine";
import { seedPatients } from "@/lib/demo/mockPatients";
import { SCENARIOS } from "@/lib/demo/scenarios";
import { uid, nextToken } from "@/lib/utils/id";

interface MediKioskState {
  lang: Lang;
  ayushMode: boolean;
  queue: PatientRecord[];
  draft: DraftPatient | null;
  lastToken: string | null;
  hasSeeded: boolean;

  setLang: (lang: Lang) => void;
  toggleAyush: () => void;

  startPatient: (category: ComplaintCategory) => void;
  setIdentity: (name: string, age: number, gender: "Male" | "Female", abhaId: string | null) => void;
  answerField: (fieldId: string, value: string | string[] | number) => void;
  startDocProcessing: () => void;
  setDocProcessingStage: (stage: ProcessingStage) => void;
  finishDocProcessing: () => void;
  submitDraft: () => string;
  resetDraft: () => void;

  loadScenario: (key: "chest_pain" | "fever" | "diabetes" | "ayush") => void;

  confirmSummary: (patientId: string) => void;
  regenerateSummary: (patientId: string) => void;

  ensureSeeded: () => void;
  resetDemo: () => void;
}

export const useMediKioskStore = create<MediKioskState>()(
  persist(
    (set, get) => ({
      lang: "en",
      ayushMode: false,
      queue: [],
      draft: null,
      lastToken: null,
      hasSeeded: false,

      setLang: (lang) => set({ lang }),
      toggleAyush: () => set((s) => ({ ayushMode: !s.ayushMode })),

      startPatient: (category) => {
        set({
          draft: {
            id: uid(),
            name: "Guest Patient",
            age: "—",
            gender: "—",
            abhaId: null,
            chiefComplaintCategory: category,
            chiefComplaintLabel: CHIEF_COMPLAINTS.find((c) => c.key === category)?.label || category,
            answers: {},
            documents: [],
            docProcessingStage: null,
          },
        });
      },

      setIdentity: (name, age, gender, abhaId) => {
        set((s) => (s.draft ? { draft: { ...s.draft, name, age, gender, abhaId } } : {}));
      },

      answerField: (fieldId, value) => {
        set((s) => (s.draft ? { draft: { ...s.draft, answers: { ...s.draft.answers, [fieldId]: value } } } : {}));
      },

      startDocProcessing: () => set((s) => (s.draft ? { draft: { ...s.draft, docProcessingStage: "uploading" } } : {})),
      setDocProcessingStage: (stage) => set((s) => (s.draft ? { draft: { ...s.draft, docProcessingStage: stage } } : {})),
      finishDocProcessing: () => {
        set((s) => {
          if (!s.draft) return {};
          const doc: DocumentRecord = mockExtractDocument(s.draft.chiefComplaintCategory);
          return { draft: { ...s.draft, documents: [doc], docProcessingStage: "done" } };
        });
      },

      submitDraft: () => {
        const s = get();
        if (!s.draft) return "";
        const history = {
          chiefComplaintCategory: s.draft.chiefComplaintCategory,
          chiefComplaintLabel: s.draft.chiefComplaintLabel,
          answers: s.draft.answers,
        };
        const summary = buildSummary(history, s.draft.documents);
        const redFlag = evaluateRedFlag(s.draft.chiefComplaintCategory, s.draft.answers);
        const token = nextToken(s.queue.length);
        const record: PatientRecord = {
          id: s.draft.id,
          name: s.draft.name,
          age: s.draft.age,
          gender: s.draft.gender as "Male" | "Female" | "—",
          abhaId: s.draft.abhaId,
          token,
          history,
          documents: s.draft.documents,
          timeline: [
            { id: uid(), year: "2024", label: "Diabetes diagnosed" },
            { id: uid(), year: "2025", label: "Hypertension documented" },
            ...(s.draft.documents.length ? [{ id: uid(), year: "Aug 2026", label: `${s.draft.documents[0].documentType} uploaded` }] : []),
            { id: uid(), year: "Today", label: "Intake completed at kiosk" },
          ],
          summary,
          redFlag,
          doctorReview: { confirmed: false, edited: false, reviewer: null, timestamp: null },
          consent: { granted: true, timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), consentTextVersion: "v1" },
          priority: redFlag.triggered ? "high" : "normal",
          aiStatus: "ready",
          status: "Waiting",
          createdAt: new Date().toISOString(),
        };
        set({ queue: [...s.queue, record], lastToken: token });
        return token;
      },

      resetDraft: () => set({ draft: null }),

      loadScenario: (key) => {
        const preset = SCENARIOS[key];
        const category: ComplaintCategory = key;
        set({
          ayushMode: key === "ayush",
          draft: {
            id: uid(),
            name: preset.name,
            age: preset.age,
            gender: preset.gender,
            abhaId: preset.abhaId,
            chiefComplaintCategory: category,
            chiefComplaintLabel: preset.ccLabel,
            answers: preset.answers,
            documents: [mockExtractDocument(category)],
            docProcessingStage: "done",
          },
        });
      },

      confirmSummary: (patientId) => {
        set((s) => ({
          queue: s.queue.map((p) =>
            p.id === patientId ? { ...p, doctorReview: { confirmed: true, edited: p.doctorReview.edited, reviewer: "Dr. On Duty", timestamp: new Date().toISOString() } } : p
          ),
        }));
      },
      regenerateSummary: (patientId) => {
        set((s) => ({
          queue: s.queue.map((p) =>
            p.id === patientId ? { ...p, summary: buildSummary(p.history, p.documents), doctorReview: { confirmed: false, edited: false, reviewer: null, timestamp: null } } : p
          ),
        }));
      },

      ensureSeeded: () => {
        const s = get();
        if (!s.hasSeeded && s.queue.length === 0) {
          set({ queue: seedPatients(), hasSeeded: true });
        }
      },

      resetDemo: () => {
        set({ queue: seedPatients(), draft: null, lastToken: null, ayushMode: false, lang: "en", hasSeeded: true });
      },
    }),
    {
      name: "medikiosk-store",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
);
