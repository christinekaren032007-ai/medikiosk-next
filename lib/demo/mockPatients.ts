import { PatientRecord } from "@/types/patient";
import { ClinicalHistory } from "@/types/clinical";
import { CHIEF_COMPLAINTS } from "@/lib/ai/historyEngine";
import { mockExtractDocument } from "@/lib/ai/documentEngine";
import { buildSummary } from "@/lib/ai/summaryEngine";
import { evaluateRedFlag } from "@/lib/ai/redFlagEngine";
import { uid } from "@/lib/utils/id";
import { DocumentRecord, TimelineEvent } from "@/types/document";

function makeRecord(
  name: string,
  age: number,
  gender: "Male" | "Female",
  token: string,
  history: ClinicalHistory,
  withDoc: boolean,
  extraTimeline: TimelineEvent[] = []
): PatientRecord {
  const documents: DocumentRecord[] = withDoc ? [{ ...mockExtractDocument(history.chiefComplaintCategory), confirmed: true }] : [];
  const summary = buildSummary(history, documents);
  const redFlag = evaluateRedFlag(history.chiefComplaintCategory, history.answers);
  return {
    id: uid(),
    name,
    age,
    gender,
    abhaId: `XX-XXXX-XXXX-${Math.floor(1000 + Math.random() * 9000)}`,
    token,
    history,
    documents,
    timeline: [
      { id: uid(), year: "2024", label: "Diabetes diagnosed" },
      { id: uid(), year: "2025", label: "Hypertension documented" },
      ...extraTimeline,
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
}

export function seedPatients(): PatientRecord[] {
  return [
    makeRecord(
      "Ravi Kumar", 52, "Male", "A-127",
      { chiefComplaintCategory: "chest_pain", chiefComplaintLabel: CHIEF_COMPLAINTS[0].label, answers: { onset: "Yesterday", location: "Center of chest", character: "Pressure", radiation: "Left arm", severity: 7, associated: ["Shortness of breath", "Sweating"] } },
      true,
      [{ id: uid(), year: "Aug 2026", label: "Discharge Summary uploaded" }]
    ),
    makeRecord(
      "Priya S", 31, "Female", "A-128",
      { chiefComplaintCategory: "abdominal_pain", chiefComplaintLabel: "Abdominal pain", answers: { onset: "Yesterday", location: "Lower abdomen", character: "Cramping", severity: 4, associated: ["Nausea"] } },
      false
    ),
    makeRecord(
      "Arun K", 67, "Male", "A-129",
      { chiefComplaintCategory: "fever", chiefComplaintLabel: "Fever", answers: { onset: "2-3 days", intensity: "High", associated: ["Chills", "Body ache"], severity: 5 } },
      false
    ),
    makeRecord(
      "Meena R", 39, "Female", "A-130",
      { chiefComplaintCategory: "diabetes", chiefComplaintLabel: "Follow-up / fatigue", answers: { reason: "Feeling more tired than usual", adherence: "Sometimes miss a dose", diet: "Some lapses", severity: 4 } },
      true
    ),
    makeRecord(
      "Suresh P", 58, "Male", "A-131",
      { chiefComplaintCategory: "breathlessness", chiefComplaintLabel: "Breathlessness", answers: { onset: "Gradually over weeks", trigger: "On exertion / walking", severity: 8, associated: ["Swelling in legs"] } },
      true,
      [{ id: uid(), year: "Jun 2026", label: "Discharge Summary uploaded" }]
    ),
  ];
}
