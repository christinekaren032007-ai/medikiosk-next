export interface ExtractedField {
  key: string;
  value: string;
  abnormal?: boolean;
}

export interface DocumentRecord {
  id: string;
  filename: string;
  documentType: string;
  date: string;
  fields: ExtractedField[];
  confirmed: boolean;
}

export type ProcessingStage = "uploading" | "ocr" | "extracting" | "organizing" | "done" | null;

export interface TimelineEvent {
  id: string;
  year: string;
  label: string;
  sourceDocumentId?: string;
}
