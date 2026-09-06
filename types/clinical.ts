export type ComplaintCategory = "chest_pain" | "fever" | "diabetes" | "ayush" | "abdominal_pain" | "breathlessness";

export type InterviewFieldType = "choice" | "multi" | "slider";

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

export interface FamilyHistoryEntry {
  condition: string;
  relation?: string;
  details?: string;
}

export interface FollowUpQA {
  question: string;
  answer: string;
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
