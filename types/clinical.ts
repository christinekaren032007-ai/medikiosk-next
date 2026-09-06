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
export type FollowUpResponseType = "single_choice" | "multiple_choice" | "free_text" | "numeric_scale";

export interface FollowUpQuestion {
  question: string;
  responseType: FollowUpResponseType;
  options: string[];
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
}
