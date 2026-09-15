import { ClinicalHistory, FamilyHistoryEntry, FollowUpQA } from "./clinical";
import { DocumentRecord, TimelineEvent } from "./document";
import { CaseSheet, DoctorReview, Consultation, TreatmentFollowup } from "./ai";

export interface Patient {
  id: string;
  name: string;
  age: number | "—";
  gender: "Male" | "Female" | "—";
  abhaId: string | null;
}

export type EncounterStatus = "in_progress" | "submitted";
export type AIStatus = "processing" | "ready";
export type QueueStatus = "Waiting" | "In Consultation" | "Completed";

export interface ConsentState {
  granted: boolean;
  timestamp: string | null;
  consentTextVersion: string;
}

/**
 * A patient mid-way through the kiosk flow — not yet submitted to the
 * practitioner's case list. Fields fill in progressively as screens complete.
 */
export interface DraftPatient extends Patient {
  chiefComplaints: import("./clinical").ComplaintKey[];
  chiefComplaintOtherText?: string;
  chiefComplaintLabel: string;
  answers: import("./clinical").InterviewAnswers;
  documents: DocumentRecord[];
  docProcessingStage: import("./document").ProcessingStage;
  familyHistory?: FamilyHistoryEntry[];
  noFamilyHistory?: boolean;
  aiFollowUp?: FollowUpQA[];
}

/**
 * A full patient case record as it lives in the practitioner's case list —
 * everything captured during the kiosk flow, plus practitioner-side state.
 */
export interface PatientRecord extends Patient {
  token: string;
  history: ClinicalHistory;
  documents: DocumentRecord[];
  timeline: TimelineEvent[];
  caseSheet: CaseSheet;
  doctorReview: DoctorReview;
  consent: ConsentState;
  aiStatus: AIStatus;
  status: QueueStatus;
  createdAt: string;
  consultation?: Consultation | null;
  treatmentFollowups?: TreatmentFollowup[];
}
