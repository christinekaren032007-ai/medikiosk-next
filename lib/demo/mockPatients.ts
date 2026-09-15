import { PatientRecord } from "@/types/patient";
import { ClinicalHistory } from "@/types/clinical";
import { complaintLabel } from "@/lib/ai/historyEngine";
import { mockExtractDocument } from "@/lib/ai/documentEngine";
import { buildCaseSheet } from "@/lib/ai/summaryEngine";
import { uid } from "@/lib/utils/id";
import { DocumentRecord, TimelineEvent } from "@/types/document";
import { SCENARIOS } from "@/lib/demo/scenarios";

function makeRecord(
  name: string,
  age: number,
  gender: "Male" | "Female",
  token: string,
  history: ClinicalHistory,
  withDoc: boolean,
  extraTimeline: TimelineEvent[] = []
): PatientRecord {
  const documents: DocumentRecord[] = withDoc
    ? [{ ...mockExtractDocument(history.chiefComplaints[0]), reviewStatus: "confirmed", confirmed: true }]
    : [];
  const caseSheet = buildCaseSheet(history, documents);
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
      { id: uid(), year: "2024", label: "Ongoing condition documented" },
      ...extraTimeline,
    ],
    caseSheet,
    doctorReview: { confirmed: false, edited: false, reviewer: null, timestamp: null },
    consent: { granted: true, timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), consentTextVersion: "v1" },
    aiStatus: "ready",
    status: "Waiting",
    createdAt: new Date().toISOString(),
    treatmentFollowups: [],
  };
}

// Five clearly fictional demo patients spanning different chief complaints
// (PS26047 section 27), pre-seeded on first load.
export function seedPatients(): PatientRecord[] {
  const fever = SCENARIOS.fever;
  const jointPain = SCENARIOS.joint_pain;
  const digestive = SCENARIOS.digestive;
  const headache = SCENARIOS.headache;

  return [
    makeRecord(
      jointPain.name, jointPain.age, jointPain.gender, "A-127",
      { chiefComplaints: jointPain.keys, chiefComplaintLabel: complaintLabel(jointPain.keys), answers: jointPain.answers },
      true,
      [{ id: uid(), year: "Aug 2026", label: "Lab Report uploaded" }]
    ),
    makeRecord(
      digestive.name, digestive.age, digestive.gender, "A-128",
      { chiefComplaints: digestive.keys, chiefComplaintLabel: complaintLabel(digestive.keys), answers: digestive.answers },
      false
    ),
    makeRecord(
      fever.name, fever.age, fever.gender, "A-129",
      { chiefComplaints: fever.keys, chiefComplaintLabel: complaintLabel(fever.keys), answers: fever.answers },
      false
    ),
    makeRecord(
      headache.name, headache.age, headache.gender, "A-130",
      { chiefComplaints: headache.keys, chiefComplaintLabel: complaintLabel(headache.keys), answers: headache.answers },
      true,
      [{ id: uid(), year: "Jun 2026", label: "Discharge Summary uploaded" }]
    ),
    makeRecord(
      "Meena R", 39, "Female", "A-131",
      { chiefComplaints: ["fatigue"], chiefComplaintLabel: complaintLabel(["fatigue"]), answers: {
        onset: "More than 2 weeks ago", severity: 4, frequency: "Constant / ongoing", progression: "Staying the same",
        associatedSymptoms: ["Sleep disturbance"], previousEpisodes: "Yes, this is ongoing / long-term",
        prakriti: "Steady, calm, solid build (Kapha type)", vikriti: "More sluggish / heavy than usual",
        agni: "Slow, heavy after meals", kostha: "Regular and well-formed", nidana: "Stress or irregular routine",
        foodHabits: "Heavy, regular meals", sleepPattern: "Oversleeping / excessive sleep", physicalActivity: "Sedentary (little movement)",
        pastConditions: "Type 2 diabetes", currentMedications: "Metformin 500 mg", allergies: "None known", previousTreatment: "None",
      } },
      true
    ),
  ];
}
