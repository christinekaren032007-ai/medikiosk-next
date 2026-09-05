export type ComplaintCategory = "chest_pain" | "fever" | "diabetes" | "ayush" | "abdominal_pain" | "breathlessness";

export type InterviewFieldType = "choice" | "multi" | "slider";

export interface InterviewField {
  id: string;
  type: InterviewFieldType;
  question: string;
  options?: string[];
}

export type InterviewAnswers = Record<string, string | string[] | number | undefined>;

export interface ClinicalHistory {
  chiefComplaintCategory: ComplaintCategory;
  chiefComplaintLabel: string;
  answers: InterviewAnswers;
  pastMedicalHistory?: string;
  pastSurgicalHistory?: string;
  medications?: string;
  allergies?: string;
  familyHistory?: string;
  personalHistory?: string;
  reviewOfSystems?: string;
}
