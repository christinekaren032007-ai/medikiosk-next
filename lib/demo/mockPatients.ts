import { DraftPatient } from "@/types/patient";
import { ComplaintCategory, InterviewAnswers } from "@/types/clinical";
import { CHIEF_COMPLAINTS } from "@/lib/ai/historyEngine";
import { mockExtractDocument } from "@/lib/ai/documentEngine";
import { uid } from "@/lib/utils/id";

function makeDraft(
  name: string,
  age: number,
  gender: "Male" | "Female",
  category: ComplaintCategory,
  answers: InterviewAnswers,
  withDoc: boolean
): DraftPatient {
  return {
    id: uid(),
    name,
    age,
    gender,
    abhaId: `XX-XXXX-XXXX-${Math.floor(1000 + Math.random() * 9000)}`,
    chiefComplaintCategory: category,
    chiefComplaintLabel: CHIEF_COMPLAINTS.find((c) => c.key === category)?.label || category,
    answers,
    documents: withDoc ? [{ ...mockExtractDocument(category), confirmed: true }] : [],
    docProcessingStage: withDoc ? "done" : null,
    returningPatient: false,
  };
}

/** Seed data used to pre-populate the doctor queue on first load / demo reset. */
export function seedDrafts(): DraftPatient[] {
  return [
    makeDraft("Ravi Kumar", 52, "Male", "chest_pain", { onset: "Yesterday", location: "Center of chest", character: "Pressure", radiation: "Left arm", severity: 7, associated: ["Shortness of breath", "Sweating"] }, true),
    makeDraft("Priya S", 31, "Female", "abdominal_pain", { onset: "Yesterday", location: "Lower abdomen", character: "Cramping", severity: 4, associated: ["Nausea"] }, false),
    makeDraft("Arun K", 67, "Male", "fever", { onset: "2-3 days", intensity: "High", associated: ["Chills", "Body ache"], severity: 5 }, false),
    makeDraft("Meena R", 39, "Female", "diabetes", { reason: "Feeling more tired than usual", adherence: "Sometimes miss a dose", diet: "Some lapses", severity: 4 }, true),
    makeDraft("Suresh P", 58, "Male", "breathlessness", { onset: "Gradually over weeks", trigger: "On exertion / walking", severity: 8, associated: ["Swelling in legs"] }, true),
  ];
}
