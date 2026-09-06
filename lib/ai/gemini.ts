import { GoogleGenerativeAI } from "@google/generative-ai";
import { ClinicalHistory, FollowUpQA, FamilyHistoryEntry } from "@/types/clinical";
import { DocumentRecord } from "@/types/document";

const MODEL = "gemini-3.6-flash";
const TIMEOUT_MS = 15000;
const NARRATIVE_TIMEOUT_MS = 18000;
const TRANSCRIBE_TIMEOUT_MS = 25000;
export const MAX_FOLLOW_UP_QUESTIONS = 3;

const SAFETY_RULES = `You are a clinical intake assistant helping gather information from a patient BEFORE they see a doctor.
You must NEVER diagnose a disease, predict a diagnosis, prescribe medication, recommend medication, recommend treatment, or make any clinical decision.
You only ask short, relevant follow-up questions to gather more information, or summarize information the patient has already provided.
Never repeat a question that has already been answered.`;

function getModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: MODEL });
  } catch {
    return null;
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("timeout")), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

/**
 * Returns the next adaptive follow-up question, or null if Gemini is
 * unavailable, errors, times out, or has gathered enough information.
 * Callers must treat null as "no AI question available" and let the
 * patient continue — never block the intake flow on this.
 */
export async function getFollowUpQuestion(params: {
  chiefComplaintLabel: string;
  answers: Record<string, unknown>;
  priorFollowUp: FollowUpQA[];
  familyHistory?: FamilyHistoryEntry[];
  noFamilyHistory?: boolean;
}): Promise<string | null> {
  const model = getModel();
  if (!model) return null;
  if (params.priorFollowUp.length >= MAX_FOLLOW_UP_QUESTIONS) return null;

  const familyHistoryText = params.noFamilyHistory
    ? "None reported."
    : params.familyHistory?.length
      ? JSON.stringify(params.familyHistory)
      : "Not yet reported.";

  const prompt = `${SAFETY_RULES}

Chief complaint: ${params.chiefComplaintLabel}
Information already collected from the structured intake form: ${JSON.stringify(params.answers)}
Family medical history: ${familyHistoryText}
Follow-up questions already asked and answered in this conversation: ${JSON.stringify(params.priorFollowUp)}

Ask ONE short, relevant follow-up question to gather more useful information for the doctor, based on what hasn't been covered yet. You may take family medical history into account if it's relevant to the chief complaint.
Do not repeat a question already asked. Do not ask about anything unrelated to the chief complaint.
If you have gathered enough information already, respond with exactly: DONE

Respond with ONLY the question text, or exactly the word DONE. No other text.`;

  try {
    const result = await withTimeout(model.generateContent(prompt), TIMEOUT_MS);
    const text = result.response.text().trim();
    if (!text || text.toUpperCase() === "DONE") return null;
    return text.replace(/^["']|["']$/g, "");
  } catch {
    return null;
  }
}

/**
 * Returns an AI-written narrative clinical summary, or null if Gemini is
 * unavailable/errors/times out. The rule-based summary (summaryEngine.ts)
 * is always the source of truth for the doctor — this is an enrichment
 * layer only, never a replacement.
 */
export async function getClinicalNarrative(params: {
  history: ClinicalHistory;
  documents: DocumentRecord[];
}): Promise<string | null> {
  const model = getModel();
  if (!model) return null;

  const { history, documents } = params;
  const prompt = `${SAFETY_RULES}

Write a concise clinical summary for a doctor, using ONLY the information provided below. Do not invent any information that isn't present. Do not infer a diagnosis. Do not recommend treatment or medication.

Chief complaint: ${history.chiefComplaintLabel}
Structured answers: ${JSON.stringify(history.answers)}
Family medical history: ${JSON.stringify(history.familyHistory || [])}
Follow-up questions and answers: ${JSON.stringify(history.aiFollowUp || [])}
Uploaded documents: ${JSON.stringify(documents.map((d) => ({ type: d.documentType, fields: d.fields })))}

Organize the summary into short labeled sections where the information is available (Chief Complaint, Reported Symptoms, Duration, Relevant Medical History, Family Medical History, Allergies, Current Medications, Follow-up Findings). Omit sections with no information rather than guessing. Keep it factual and concise — this is for a doctor to quickly review, not a patient-facing document.`;

  try {
    const result = await withTimeout(model.generateContent(prompt), NARRATIVE_TIMEOUT_MS);
    const text = result.response.text().trim();
    return text || null;
  } catch {
    return null;
  }
}

/**
 * Transcribes a doctor's handwriting (prescription or notes) from an image
 * into plain text. Never invents unclear content — ambiguous words/numbers
 * are wrapped in [[double brackets]] so the UI can flag them for the doctor
 * to correct. This is ALWAYS a draft: the doctor must review, edit, and
 * explicitly confirm before anything is saved.
 */
export async function transcribeHandwriting(imageBase64: string): Promise<{ text: string | null; uncertain: boolean }> {
  const model = getModel();
  if (!model) return { text: null, uncertain: false };

  const prompt = `You are transcribing a doctor's handwritten note or prescription from an image into plain text.
Transcribe EXACTLY what is written. Do not guess, complete, or infer anything that is not clearly legible.
If any word, number, or dosage is unclear or ambiguous (for example, unclear whether it says "5 mg" or "50 mg"), wrap that exact portion in double square brackets like [[unclear]] rather than guessing a value.
Do not add any diagnosis, medication choice, or dosage that is not explicitly and clearly written.
Respond with ONLY the transcribed text, nothing else.`;

  try {
    const result = await withTimeout(
      model.generateContent([{ inlineData: { data: imageBase64, mimeType: "image/png" } }, { text: prompt }]),
      TRANSCRIBE_TIMEOUT_MS
    );
    const text = result.response.text().trim();
    if (!text) return { text: null, uncertain: false };
    const uncertain = /\[\[.*?\]\]/.test(text);
    return { text, uncertain };
  } catch {
    return { text: null, uncertain: false };
  }
}

/**
 * Structures a DOCTOR-CONFIRMED prescription text into medicine fields.
 * The input has already been verified by the doctor, so this only organizes
 * it — it must never invent a field that isn't present in the text, and the
 * doctor still reviews/edits the resulting fields before saving.
 */
export async function parsePrescriptionText(
  text: string
): Promise<{ name: string; dosage: string; frequency: string; duration: string }[] | null> {
  const model = getModel();
  if (!model) return null;

  const prompt = `Extract structured medicine entries from this doctor-confirmed prescription text. The text has already been verified by the doctor as accurate — do not second-guess its content, only structure it.

Text: """${text}"""

For each medicine mentioned, extract: name, dosage, frequency, duration. If a field isn't present in the text, leave it as an empty string — never invent or guess a value that isn't there.
Respond with ONLY a JSON array, like: [{"name":"...","dosage":"...","frequency":"...","duration":"..."}]. No markdown, no other text.`;

  try {
    const result = await withTimeout(model.generateContent(prompt), TIMEOUT_MS);
    const raw = result.response.text().trim().replace(/^```json\s*|```\s*$/g, "");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.map((m: any) => ({
      name: String(m.name || ""),
      dosage: String(m.dosage || ""),
      frequency: String(m.frequency || ""),
      duration: String(m.duration || ""),
    }));
  } catch (err) {
    console.error("[parse-prescription] error:", err);
    return null;
  }
}
