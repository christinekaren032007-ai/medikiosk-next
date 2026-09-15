import { NextRequest, NextResponse } from "next/server";
import { extractDocumentFields } from "@/lib/ai/gemini";
import { mockExtractDocument } from "@/lib/ai/documentEngine";
import { uid } from "@/lib/utils/id";
import { DocumentRecord } from "@/types/document";
import { ComplaintKey } from "@/types/clinical";

export const dynamic = "force-dynamic";

/**
 * Digitizes an uploaded medical document. Always returns a DRAFT the
 * patient/practitioner must confirm — reviewStatus starts "unreviewed"
 * whether it came from real Gemini-vision extraction (aiExtracted:true) or
 * the demo mock fallback (aiExtracted:false, used when there's no API key,
 * no image, or extraction fails/times out).
 */
export async function POST(req: NextRequest) {
  const { imageBase64, mimeType, filename, fallbackCategory } = (await req.json()) as {
    imageBase64?: string;
    mimeType?: string;
    filename?: string;
    fallbackCategory?: ComplaintKey;
  };

  if (imageBase64) {
    const result = await extractDocumentFields(imageBase64, mimeType || "image/jpeg");
    if (result) {
      const doc: DocumentRecord = {
        id: uid(),
        filename: filename || "Uploaded_Document",
        documentType: result.documentType,
        date: result.date || "Not visible on document",
        facility: result.facility || undefined,
        fields: result.fields,
        aiExtracted: true,
        reviewStatus: "unreviewed",
        confirmed: false,
      };
      return NextResponse.json({ document: doc });
    }
  }

  // Fallback: no image, no API key, or extraction failed/timed out.
  const doc = mockExtractDocument(fallbackCategory || "other");
  if (filename) doc.filename = filename;
  return NextResponse.json({ document: doc, usedDemoFallback: true });
}
