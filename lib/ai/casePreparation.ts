import { ClinicalHistory } from "@/types/clinical";
import { DocumentRecord } from "@/types/document";
import { HPI_FLOW, LIFESTYLE_FLOW, MEDICAL_HISTORY_FLOW } from "@/lib/ai/historyEngine";

export interface CaseSection {
  label: string;
  complete: boolean;
  note?: string;
}

export interface CasePreparation {
  percent: number;
  sections: CaseSection[];
}

function answered(answers: Record<string, unknown>, ids: string[]): boolean {
  return ids.every((id) => {
    const v = answers[id];
    return v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0);
  });
}

/**
 * How complete the patient's case information is — NOT a medical severity
 * or triage score (PS26047 section 4). Purely reflects which sections of
 * the intake are filled in, so the practitioner knows what to ask about.
 */
export function computeCasePreparation(history: ClinicalHistory, documents: DocumentRecord[]): CasePreparation {
  const { chiefComplaints, answers } = history;

  const sections: CaseSection[] = [
    { label: "Chief Complaint", complete: chiefComplaints.length > 0 },
    { label: "History of Present Illness", complete: answered(answers, HPI_FLOW.map((f) => f.id)) },
    { label: "Prakriti", complete: answered(answers, ["prakriti"]) },
    { label: "Vikriti", complete: answered(answers, ["vikriti"]) },
    { label: "Agni", complete: answered(answers, ["agni"]) },
    { label: "Kostha", complete: answered(answers, ["kostha"]) },
    { label: "Ahara-Vihara", complete: answered(answers, LIFESTYLE_FLOW.map((f) => f.id)) },
    { label: "Nidana", complete: answered(answers, ["nidana"]) },
    { label: "Relevant Medical History", complete: answered(answers, MEDICAL_HISTORY_FLOW.map((f) => f.id)) },
    { label: "Documents", complete: documents.length > 0 && documents.every((d) => d.reviewStatus !== "unreviewed") },
  ];

  const percent = Math.round((sections.filter((s) => s.complete).length / sections.length) * 100);
  return { percent, sections };
}
