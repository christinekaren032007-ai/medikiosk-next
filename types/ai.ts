export interface AyushCaseInfo {
  prakriti: string;
  vikriti: string;
  agni: string;
  kostha: string;
  aharaVihara: string;
  nidana: string;
}

export interface CaseSheet {
  chiefComplaint: string;
  hpi: string;
  ayush: AyushCaseInfo;
  medicalHistory: string;
  currentMedications: string;
  allergies: string;
  previousTreatment: string;
  documentsSummary: string;
  generatedAt: string;
  aiNarrative?: string;
  aiGenerated?: boolean;
}

export interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface Consultation {
  diagnosis: string;
  medicines: Medicine[];
  additionalInstructions: string;
  doctorNotes: string;
  completedAt: string;
}

export interface DoctorReview {
  confirmed: boolean;
  edited: boolean;
  reviewer: string | null;
  timestamp: string | null;
}

export type TreatmentResponseStatus = "better" | "same" | "worse";

export interface TreatmentFollowup {
  id: string;
  date: string;
  status: TreatmentResponseStatus;
  severity?: number;
  newSymptoms?: string;
  adherence?: string;
  sideEffects?: string;
}

/** A single item the AI thinks may need practitioner clarification. Never a diagnosis or severity judgment. */
export interface ClarificationItem {
  id: string;
  label: string;
  section: string;
}
