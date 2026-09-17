export type ComplaintCategory =
  | "chest_pain"
  | "fever"
  | "diabetes"
  | "ayush"
  | "abdominal_pain"
  | "breathlessness"
  | "cough"
  | "headache"
  | "nausea_vomiting"
  | "injury_pain"
  | "diarrhea"
  | "skin_problem"
  | "digestive_problem"
  | "joint_pain"
  | "sleep_problem"
  | "stress_fatigue"
  | "menstrual_concern"
  | "other";

export type InterviewFieldType = "choice" | "multi" | "slider" | "text";

export interface InterviewField {
  id: string;
  type: InterviewFieldType;
  question: string;
  options?: string[];
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

export interface FollowUpQA {
  question: string;
  answer: string;
}

/**
 * Response type an AI-generated follow-up question can request, so the
 * patient gets appropriate tap targets instead of always typing free text.
 * The saved answer (FollowUpQA above) is unaffected — this only shapes how
 * the question is PRESENTED before the answer is captured.
 */
export type FollowUpResponseType = "yes_no" | "single_select" | "multi_select" | "slider" | "short_text";

export interface FollowUpQuestion {
  question: string;
  type: FollowUpResponseType;
  options: string[];
  required: boolean;
}

/**
 * A simplified, patient-facing capture of Trividha Pariksha (the three
 * classical AYUSH examination methods). Darshana (visual observation) and
 * Sparshana (touch/tactile sensation) are rephrased as self-reported
 * questions since the patient — not the physician — is answering them at
 * the kiosk. The doctor dashboard shows these under their AYUSH terms.
 */
export interface AyushAssessment {
  darshana: string[];
  sparshana: string;
  prashna: string;
}

export interface ClinicalHistory {
  chiefComplaintCategory: ComplaintCategory;
  chiefComplaintLabel: string;
  answers: InterviewAnswers;
  pastMedicalHistory?: string;
  pastSurgicalHistory?: string;
  medications?: string;
  allergies?: string;
  familyHistory?: FamilyHistoryEntry[];
  noFamilyHistory?: boolean;
  aiFollowUp?: FollowUpQA[];
  personalHistory?: string;
  reviewOfSystems?: string;
  ayushAssessment?: AyushAssessment;
  returningPatient?: boolean;
  previousRecordUsed?: boolean;
}
