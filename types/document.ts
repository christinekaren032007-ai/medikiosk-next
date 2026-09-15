export interface ExtractedField {
  key: string;
  value: string;
  /** True when the doctor should double-check this value (lab value out of typical range, etc). Not a diagnosis. */
  flagForReview?: boolean;
}

export type DocumentReviewStatus = "unreviewed" | "confirmed" | "edited" | "rejected";

export interface DocumentRecord {
  id: string;
  filename: string;
  documentType: string;
  date: string;
  facility?: string;
  fields: ExtractedField[];
  /** True if this came from a real Gemini-vision extraction rather than the demo mock. */
  aiExtracted: boolean;
  reviewStatus: DocumentReviewStatus;
  /** @deprecated use reviewStatus !== "unreviewed" */
  confirmed: boolean;
}

export type ProcessingStage = "uploading" | "extracting" | "organizing" | "done" | null;

export interface TimelineEvent {
  id: string;
  year: string;
  label: string;
  sourceDocumentId?: string;
}
