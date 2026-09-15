import { ClinicalHistory, InterviewField } from "@/types/clinical";
import { DocumentRecord } from "@/types/document";
import { ClarificationItem } from "@/types/ai";
import { getFullFlow } from "@/lib/ai/historyEngine";
import { uid } from "@/lib/utils/id";

const VAGUE_MARKERS = new Set(["Not sure", "Varies a lot", "No noticeable change", "I don't remember", "Nothing specific"]);

/**
 * A lightweight, rule-based "needs clarification" list for the practitioner
 * (PS26047 section 18). Deliberately NOT a diagnosis or severity judgment —
 * it only flags vague/uncertain patient answers and document values so the
 * practitioner can choose to ask, ignore, or edit.
 */
export function computeClarifications(history: ClinicalHistory, documents: DocumentRecord[]): ClarificationItem[] {
  const items: ClarificationItem[] = [];
  const flow: InterviewField[] = getFullFlow();

  for (const field of flow) {
    const value = history.answers[field.id];
    const isVague = typeof value === "string" && VAGUE_MARKERS.has(value);
    if (isVague) {
      items.push({ id: uid(), label: `${field.question.split("?")[0]} was answered as "${value}" — may be worth clarifying.`, section: field.technicalTerm || field.section });
    }
  }

  if (!history.noFamilyHistory && (!history.familyHistory || history.familyHistory.length === 0)) {
    items.push({ id: uid(), label: "Family medical history was not reported.", section: "Medical History" });
  }

  for (const doc of documents) {
    for (const f of doc.fields) {
      if (f.flagForReview) {
        items.push({ id: uid(), label: `${f.key} (${f.value}) in ${doc.documentType} is flagged for review — may be outside a typical range.`, section: "Documents" });
      }
    }
    if (doc.aiExtracted && doc.reviewStatus === "unreviewed") {
      items.push({ id: uid(), label: `${doc.documentType} was AI-extracted but not yet reviewed by the patient.`, section: "Documents" });
    }
  }

  return items;
}
