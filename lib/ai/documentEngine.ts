import { ComplaintCategory } from "@/types/clinical";
import { DocumentRecord, ExtractedField } from "@/types/document";
import { uid } from "@/lib/utils/id";

interface DocMockDef {
  filename: string;
  documentType: string;
  date: string;
  fields: ExtractedField[];
}

const GENERIC_DOC_MOCK: DocMockDef = {
  filename: "Lab_Report.pdf",
  documentType: "Lab Report",
  date: "12 Aug 2026",
  fields: [
    { key: "Diagnosis", value: "Not on record" },
    { key: "Medications", value: "None reported" },
    { key: "Procedures", value: "None" },
  ],
};

const DOC_MOCKS: Partial<Record<ComplaintCategory, DocMockDef>> = {
  chest_pain: {
    filename: "Discharge_Summary.pdf",
    documentType: "Discharge Summary",
    date: "12 Aug 2026",
    fields: [
      { key: "Diagnosis", value: "Type 2 Diabetes Mellitus" },
      { key: "Medications", value: "Metformin 500 mg, Amlodipine 5 mg" },
      { key: "Procedures", value: "None" },
    ],
  },
  fever: {
    filename: "Discharge_Summary.pdf",
    documentType: "Discharge Summary",
    date: "12 Aug 2026",
    fields: [
      { key: "Diagnosis", value: "Type 2 Diabetes Mellitus" },
      { key: "Medications", value: "Metformin 500 mg, Amlodipine 5 mg" },
      { key: "Procedures", value: "None" },
    ],
  },
  diabetes: {
    filename: "Blood_Test_Report.pdf",
    documentType: "Blood Test Report",
    date: "12 Aug 2026",
    fields: [
      { key: "Hemoglobin", value: "10.2 g/dL", abnormal: true },
      { key: "HbA1c", value: "8.2%", abnormal: true },
      { key: "Glucose", value: "164 mg/dL", abnormal: true },
    ],
  },
  ayush: {
    filename: "Discharge_Summary.pdf",
    documentType: "Discharge Summary",
    date: "12 Aug 2026",
    fields: [
      { key: "Diagnosis", value: "Type 2 Diabetes Mellitus" },
      { key: "Medications", value: "Metformin 500 mg, Amlodipine 5 mg" },
      { key: "Procedures", value: "None" },
    ],
  },
  abdominal_pain: {
    filename: "Lab_Report.pdf",
    documentType: "Lab Report",
    date: "3 Jul 2026",
    fields: [
      { key: "Diagnosis", value: "Not on record" },
      { key: "Medications", value: "None reported" },
      { key: "Procedures", value: "None" },
    ],
  },
  breathlessness: {
    filename: "Discharge_Summary.pdf",
    documentType: "Discharge Summary",
    date: "20 Jun 2026",
    fields: [
      { key: "Diagnosis", value: "Hypertension" },
      { key: "Medications", value: "Amlodipine 5 mg" },
      { key: "Procedures", value: "None" },
    ],
  },
};

export const PROCESSING_STAGES = ["uploading", "ocr", "extracting", "organizing"] as const;

/**
 * Simulates OCR + entity extraction. Deterministic — the uploaded file's
 * actual content is never read; this is a demo engine, not real OCR.
 * A real implementation would swap this for an OCR/vision API call.
 */
export function mockExtractDocument(category: ComplaintCategory): DocumentRecord {
  const mock = DOC_MOCKS[category] || GENERIC_DOC_MOCK;
  return {
    id: uid(),
    filename: mock.filename,
    documentType: mock.documentType,
    date: mock.date,
    fields: mock.fields,
    confirmed: false,
  };
}
