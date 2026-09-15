// Chief complaints a patient can select (multiple allowed) — see problem
// statement PS26047 section 5A. Intentionally NOT emergency-flavored
// categories (no "chest pain" / "breathlessness" red-flag framing).
export type ComplaintKey =
  | "fever"
  | "cough"
  | "headache"
  | "joint_pain"
  | "back_pain"
  | "digestive"
  | "skin"
  | "menstrual"
  | "fatigue"
  | "sleep"
  | "other";

export type InterviewFieldType = "choice" | "multi" | "slider" | "text" | "yes_no";

export type FlowSection = "hpi" | "ayush" | "lifestyle" | "medical_history";

export interface InterviewField {
  id: string;
  type: InterviewFieldType;
  question: string;
  /** Ayurvedic/technical term shown alongside the plain-language question, e.g. "Agni". */
  technicalTerm?: string;
  options?: string[];
  section: FlowSection;
}

export type InterviewAnswers = Record<string, string | string[] | number | undefined>;

export const FAMILY_CONDITIONS = [
  "Diabetes",
  "Hypertension",
  "Heart disease",
  "Asthma",
  "Cancer",
  "Kidney disease",
  "Liver disease",
  "Other",
] as const;

export const RELATION_OPTIONS = ["Mother", "Father", "Sibling", "Grandparent", "Other"] as const;

export interface FamilyHistoryEntry {
  condition: string;
  relation?: string;
  details?: string;
}

/**
 * Response type an AI-generated follow-up question can request, so the
 * patient gets appropriate tap targets instead of always typing free text.
 * Mirrors the structured schema in PS26047 section 8.
 */
export type FollowUpResponseType = "yes_no" | "single_choice" | "multi_choice" | "slider" | "text";

export interface FollowUpQuestion {
  question: string;
  type: FollowUpResponseType;
  options: string[];
  /** Which part of the case this question is filling in, e.g. "History of Present Illness" or "Agni". */
  section: string;
  /**
   * Why Gemini asked this — for practitioner-facing explainability only
   * (PS26047 section 19). Never shown to the patient.
   */
  reason: string;
}

export interface FollowUpQA {
  question: string;
  answer: string;
  type: FollowUpResponseType;
  section: string;
  reason: string;
}

export interface AharaViharaAnswers {
  foodHabits?: string;
  mealTiming?: string;
  waterIntake?: string;
  sleepPattern?: string;
  physicalActivity?: string;
  dailyRoutine?: string;
  yogaMeditation?: string;
}

export interface ClinicalHistory {
  chiefComplaints: ComplaintKey[];
  chiefComplaintOtherText?: string;
  /** Display label built from the selected complaints, e.g. "Fever, Joint pain". */
  chiefComplaintLabel: string;
  answers: InterviewAnswers;
  familyHistory?: FamilyHistoryEntry[];
  noFamilyHistory?: boolean;
  aiFollowUp?: FollowUpQA[];
}
