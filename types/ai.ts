export interface AISummary {
  chiefComplaint: string;
  hpi: string;
  pastHistory: string;
  medications: string;
  allergies: string;
  investigations: string;
  generatedAt: string;
}

export interface RedFlag {
  triggered: boolean;
  reason: string | null;
}

export interface DoctorReview {
  confirmed: boolean;
  edited: boolean;
  reviewer: string | null;
  timestamp: string | null;
}
