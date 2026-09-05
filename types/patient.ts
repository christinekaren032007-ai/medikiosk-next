import { ClinicalHistory } from "./clinical";
import { DocumentRecord, TimelineEvent } from "./document";
import { AISummary, RedFlag, DoctorReview } from "./ai";

export interface Patient {
  id: string;
  name: string;
  age: number | "—";
  gender: "Male" | "Female" | "—";
  abhaId: string | null;
}

export type EncounterStatus = "in_progress" | "submitted";
export type Priority = "normal" | "high";
export type AIStatus = "processing" | "ready";
export type QueueStatus = "Waiting" | "In Consultation" | "Completed";

export interface ConsentState {
  granted: boolean;
  timestamp: string | null;
  consentTextVersion: string;
}

/**
 * A full patient record as it lives in the doctor's queue —
 * everything captured during the kiosk flow, plus doctor-side state.
 */
/**
 * A patient mid-way through the kiosk flow — not yet submitted to the
 * doctor's queue. Fields fill in progressively as screens complete.
 */
export interface DraftPatient extends Patient {
  chiefComplaintCategory: import("./clinical").ComplaintCategory;
  chiefComplaintLabel: string;
  answers: import("./clinical").InterviewAnswers;
  documents: DocumentRecord[];
  docProcessingStage: import("./document").ProcessingStage;
}

export interface PatientRecord extends Patient {
  token: string;
  history: ClinicalHistory;
  documents: DocumentRecord[];
  timeline: TimelineEvent[];
  summary: AISummary;
  redFlag: RedFlag;
  doctorReview: DoctorReview;
  consent: ConsentState;
  priority: Priority;
  aiStatus: AIStatus;
  status: QueueStatus;
  createdAt: string;
}
