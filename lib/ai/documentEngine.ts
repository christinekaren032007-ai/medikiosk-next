import { ComplaintKey } from "@/types/clinical";
import { DocumentRecord, ExtractedField } from "@/types/document";
import { uid } from "@/lib/utils/id";

interface DocMockDef {
  filename: string;
  documentType: string;
  date: string;
  facility?: string;
  fields: ExtractedField[];
}

const GENERIC_DOC_MOCK: DocMockDef = {
  filename: "Lab_Report.pdf",
  documentType: "Lab Report",
  date: "12 Aug 2026",
  fields: [
    { key: "Diagnosis", value: "Not on record" },
    { key: "Medications", value: "None reported" },
  ],
};

const DOC_MOCKS: Partial<Record<ComplaintKey, DocMockDef>> = {
  fever: {
    filename: "Discharge_Summary.pdf",
    documentType: "Discharge Summary",
    date: "12 Aug 2026",
    facility: "Community Health Centre",
    fields: [
      { key: "Diagnosis", value: "Viral fever" },
      { key: "Medications", value: "Paracetamol 500 mg" },
    ],
  },
  joint_pain: {
    filename: "Blood_Test_Report.pdf",
    documentType: "Lab Report",
    date: "3 Jul 2026",
    facility: "City Diagnostics",
    fields: [
      { key: "ESR", value: "32 mm/hr", flagForReview: true },
      { key: "Uric Acid", value: "5.1 mg/dL" },
    ],
  },
  digestive: {
    filename: "Prescription.pdf",
    documentType: "Prescription",
    date: "20 Jun 2026",
    facility: "Dr. Menon's Clinic",
    fields: [
      { key: "Diagnosis", value: "Acid reflux" },
      { key: "Medications", value: "Antacid syrup" },
    ],
  },
  fatigue: {
    filename: "Blood_Test_Report.pdf",
    documentType: "Lab Report",
    date: "12 Aug 2026",
    facility: "City Diagnostics",
    fields: [
      { key: "Hemoglobin", value: "10.2 g/dL", flagForReview: true },
      { key: "HbA1c", value: "6.1%" },
    ],
  },
};

export const PROCESSING_STAGES = ["uploading", "extracting", "organizing"] as const;

/**
 * Deterministic demo fallback used only when there's no real uploaded file
 * or Gemini extraction isn't available (no API key / error / timeout).
 * Always clearly distinguishable from a real extraction via aiExtracted:false.
 */
export function mockExtractDocument(category: ComplaintKey): DocumentRecord {
  const mock = DOC_MOCKS[category] || GENERIC_DOC_MOCK;
  return {
    id: uid(),
    filename: mock.filename,
    documentType: mock.documentType,
    date: mock.date,
    facility: mock.facility,
    fields: mock.fields,
    aiExtracted: false,
    reviewStatus: "unreviewed",
    confirmed: false,
  };
}
