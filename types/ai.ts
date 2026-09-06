export interface AISummary {
  chiefComplaint: string;
  hpi: string;
  pastHistory: string;
  medications: string;
  allergies: string;
  investigations: string;
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
