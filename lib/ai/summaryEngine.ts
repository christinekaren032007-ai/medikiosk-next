import { ClinicalHistory } from "@/types/clinical";
import { DocumentRecord } from "@/types/document";
import { AISummary } from "@/types/ai";
import { CHIEF_COMPLAINTS } from "@/lib/ai/historyEngine";

/**
 * Builds a physician-ready draft summary from the patient's answers and
 * any digitized documents. This is always labelled as an AI-generated
 * draft requiring physician review — never presented as a diagnosis.
 */
export function buildSummary(history: ClinicalHistory, documents: DocumentRecord[]): AISummary {
  const { chiefComplaintCategory: category, answers } = history;
  const doc = documents[0];

  let hpi = "Not reported.";
  if (category === "chest_pain") {
    const assoc = (answers.associated as string[] | undefined)?.filter((a) => a !== "None") || [];
    const radiation = answers.radiation as string | undefined;
    hpi = `Patient reports ${String(answers.character).toLowerCase()}-like ${String(answers.location).toLowerCase()} pain beginning ${String(answers.onset).toLowerCase()}, severity ${answers.severity}/10${
      radiation && radiation !== "No" ? `, radiating to the ${radiation.toLowerCase()}` : ""
    }${assoc.length ? `, associated with ${assoc.join(", ").toLowerCase()}` : ""}.`;
  } else if (category === "fever") {
    const assoc = (answers.associated as string[] | undefined)?.filter((a) => a !== "None") || [];
    hpi = `Patient reports fever for ${String(answers.onset).toLowerCase()}, intensity described as ${String(answers.intensity).toLowerCase()}${
      assoc.length ? `, with ${assoc.join(", ").toLowerCase()}` : ""
    }. Self-rated severity ${answers.severity}/10.`;
  } else if (category === "diabetes") {
    hpi = `Patient here for ${String(answers.reason).toLowerCase()}. Medication adherence: ${String(answers.adherence).toLowerCase()}. Diet control: ${String(answers.diet).toLowerCase()}. Energy level self-rated ${answers.severity}/10.`;
  } else if (category === "ayush") {
    hpi = `Patient presents for general wellness assessment. Prakriti assessed as ${String(answers.prakriti).split(" (")[1]?.replace(")", "") || "undetermined"}. Agni: ${String(answers.agni).toLowerCase()}. Koshtha: ${String(answers.koshtha).toLowerCase()}. Reported triggers: ${String(answers.nidana).toLowerCase()}.`;
  } else if (category === "abdominal_pain") {
    const assoc = (answers.associated as string[] | undefined)?.filter((a) => a !== "None") || [];
    hpi = `Patient reports ${String(answers.character).toLowerCase()} pain in the ${String(answers.location).toLowerCase()}, beginning ${String(answers.onset).toLowerCase()}, severity ${answers.severity}/10${assoc.length ? `, with ${assoc.join(", ").toLowerCase()}` : ""}.`;
  } else if (category === "breathlessness") {
    const assoc = (answers.associated as string[] | undefined)?.filter((a) => a !== "None") || [];
    hpi = `Patient reports breathlessness since ${String(answers.onset).toLowerCase()}, most noticeable ${String(answers.trigger).toLowerCase()}, severity ${answers.severity}/10${assoc.length ? `, associated with ${assoc.join(", ").toLowerCase()}` : ""}.`;
  } else if (answers.description) {
    const onset = answers.onset ? ` beginning ${String(answers.onset).toLowerCase()}` : "";
    const severity = answers.severity !== undefined ? `, severity ${answers.severity}/10` : "";
    hpi = `Patient reports: "${String(answers.description)}"${onset}${severity}.`;
  }

  const pastHistory = doc ? doc.fields.find((f) => f.key === "Diagnosis")?.value || "Not reported by patient." : "Not reported by patient.";
  const medications = doc ? doc.fields.find((f) => f.key === "Medications")?.value || "None reported." : "None reported.";
  const investigations = doc
    ? doc.fields.filter((f) => !["Diagnosis", "Medications", "Procedures"].includes(f.key)).map((f) => `${f.key} — ${f.value}`).join("; ") || "None uploaded."
    : "None uploaded.";

  return {
    chiefComplaint: `${CHIEF_COMPLAINTS.find((c) => c.key === category)?.label || "Not reported"}${category === "chest_pain" ? ` for ${String(answers.onset).toLowerCase()}` : ""}.`,
    hpi,
    pastHistory,
    medications,
    allergies: "No known drug allergies reported.",
    investigations,
    generatedAt: new Date().toISOString(),
  };
}
