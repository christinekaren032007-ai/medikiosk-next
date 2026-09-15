import { ClinicalHistory } from "@/types/clinical";
import { DocumentRecord } from "@/types/document";
import { CaseSheet } from "@/types/ai";

function str(v: unknown, fallback = "Not reported."): string {
  if (v === undefined || v === null || v === "") return fallback;
  return Array.isArray(v) ? v.join(", ") : String(v);
}

/**
 * Builds a practitioner-ready draft case sheet from the patient's answers
 * and any digitized documents (PS26047 section 17). This organizes WHAT
 * THE PATIENT SAID — it never infers a diagnosis and never fills in the
 * Diagnosis/Treatment fields, which are practitioner-entered only.
 */
export function buildCaseSheet(history: ClinicalHistory, documents: DocumentRecord[]): CaseSheet {
  const { answers } = history;

  const hpiParts: string[] = [];
  if (answers.onset) hpiParts.push(`Onset: ${str(answers.onset)}`);
  if (answers.location) hpiParts.push(`Location: ${str(answers.location)}`);
  if (answers.character) hpiParts.push(`Character: ${str(answers.character)}`);
  if (answers.severity !== undefined) hpiParts.push(`Self-rated severity: ${answers.severity}/10`);
  if (answers.frequency) hpiParts.push(`Frequency: ${str(answers.frequency)}`);
  if (answers.progression) hpiParts.push(`Progression: ${str(answers.progression)}`);
  if (answers.aggravating) hpiParts.push(`Aggravating factors: ${str(answers.aggravating)}`);
  if (answers.relieving) hpiParts.push(`Relieving factors: ${str(answers.relieving)}`);
  if (answers.associatedSymptoms) hpiParts.push(`Associated symptoms: ${str(answers.associatedSymptoms)}`);
  if (answers.previousEpisodes) hpiParts.push(`Previous episodes: ${str(answers.previousEpisodes)}`);
  const hpi = hpiParts.length ? hpiParts.join(". ") + "." : "Not reported.";

  const aharaViharaParts: string[] = [];
  if (answers.foodHabits) aharaViharaParts.push(`Diet: ${str(answers.foodHabits)}`);
  if (answers.mealTiming) aharaViharaParts.push(`Meal timing: ${str(answers.mealTiming)}`);
  if (answers.waterIntake) aharaViharaParts.push(`Water intake: ${str(answers.waterIntake)}`);
  if (answers.sleepPattern) aharaViharaParts.push(`Sleep: ${str(answers.sleepPattern)}`);
  if (answers.physicalActivity) aharaViharaParts.push(`Physical activity: ${str(answers.physicalActivity)}`);
  if (answers.dailyRoutine) aharaViharaParts.push(`Daily routine: ${str(answers.dailyRoutine)}`);
  if (answers.yogaMeditation) aharaViharaParts.push(`Yoga/meditation: ${str(answers.yogaMeditation)}`);
  const aharaVihara = aharaViharaParts.length ? aharaViharaParts.join(". ") + "." : "Not reported.";

  const documentsSummary = documents.length
    ? documents
        .map((d) => `${d.documentType}${d.date ? ` (${d.date})` : ""}: ${d.fields.map((f) => `${f.key} — ${f.value}`).join("; ") || "no fields extracted"}`)
        .join(" | ")
    : "No documents uploaded.";

  return {
    chiefComplaint: history.chiefComplaintLabel || "Not reported",
    hpi,
    ayush: {
      prakriti: str(answers.prakriti),
      vikriti: str(answers.vikriti),
      agni: str(answers.agni),
      kostha: str(answers.kostha),
      aharaVihara,
      nidana: str(answers.nidana),
    },
    medicalHistory: str(answers.pastConditions),
    currentMedications: str(answers.currentMedications, "None reported."),
    allergies: str(answers.allergies, "None reported."),
    previousTreatment: str(answers.previousTreatment, "None reported."),
    documentsSummary,
    generatedAt: new Date().toISOString(),
  };
}
