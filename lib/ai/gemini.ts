import { GoogleGenerativeAI } from "@google/generative-ai";
import { ClinicalHistory, FollowUpQA, FamilyHistoryEntry, FollowUpQuestion, FollowUpResponseType, InterviewField } from "@/types/clinical";
import { DocumentRecord, ExtractedField } from "@/types/document";

const VALID_RESPONSE_TYPES: FollowUpResponseType[] = ["yes_no", "single_choice", "multi_choice", "slider", "text"];

const MODEL = "gemini-3.6-flash";
const VISION_MODEL = "gemini-3.6-flash";
const TIMEOUT_MS = 15000;
const NARRATIVE_TIMEOUT_MS = 18000;
const TRANSCRIBE_TIMEOUT_MS = 25000;
const EXTRACT_TIMEOUT_MS = 25000;
export const MAX_FOLLOW_UP_QUESTIONS = 3;

/**
 * Hard safety boundary for every prompt in this file (PS26047 section 2).
 * The AI only asks questions and organizes what the patient already said —
 * it never diagnoses, triages, scores severity/risk, or recommends
 * treatment/medication.
 */
const SAFETY_RULES = `You are Rapha, a clinical case-taking assistant for an AYUSH (Ayurveda/Yoga/Unani/Siddha/Homeopathy) outpatient setting. You gather and organize information from a patient BEFORE they see a practitioner.
You must NEVER diagnose a disease or condition, predict a diagnosis, suggest a treatment, recommend or dose a medicine, generate a prescription, perform emergency triage, assign a severity/risk/priority score, or generate any red-flag/emergency alert.
You only ask short, relevant follow-up questions to gather more information, or organize/summarize information the patient has already provided. Any uncertain or incomplete information must be labeled as such, never presented as confirmed fact.
Never repeat a question that has already been answered. The practitioner makes all clinical decisions — you only help prepare the case for them.`;

function getModel(modelName: string = MODEL) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: modelName });
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

function stripCodeFence(text: string): string {
  return text.replace(/^```json\s*|^```\s*|```\s*$/g, "").trim();
}

/**
 * Returns the next adaptive AYUSH follow-up question, or null if Gemini is
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
}): Promise<FollowUpQuestion | null> {
  const model = getModel();
  if (!model) return null;
  if (params.priorFollowUp.length >= MAX_FOLLOW_UP_QUESTIONS) return null;

  const familyHistoryText = params.noFamilyHistory
    ? "None reported."
    : params.familyHistory?.length
      ? JSON.stringify(params.familyHistory)
      : "Not yet reported.";

  const prompt = `${SAFETY_RULES}

Chief complaint(s): ${params.chiefComplaintLabel}
Structured intake answers so far (includes History of Present Illness, AYUSH case information — Prakriti/Vikriti/Agni/Kostha/Nidana —, Ahara-Vihara lifestyle info, and relevant medical history): ${JSON.stringify(params.answers)}
Family medical history: ${familyHistoryText}
Follow-up questions already asked and answered in this conversation: ${JSON.stringify(params.priorFollowUp)}

Identify missing or unclear information relevant to this patient's case and ask ONE short, useful follow-up question to help complete the case for the practitioner. Do not repeat anything already answered. Stay relevant to the chief complaint and to AYUSH case-taking (do not ask generic unrelated chatbot questions).

Choose the "type" that best fits the question:
- "yes_no": a simple yes/no question
- "single_choice": the patient picks exactly one option
- "multi_choice": the patient may pick more than one option
- "slider": a 0-10 rating/severity-of-symptom style question (never used to assign clinical risk — just the patient's own rating)
- "text": only when there's no natural fixed set of options

If you have gathered enough information already, respond with exactly: DONE

Otherwise respond with ONLY a JSON object in exactly this shape, no markdown, no other text:
{"question": "...", "type": "yes_no" | "single_choice" | "multi_choice" | "slider" | "text", "options": ["..."], "section": "...", "reason": "..."}

"section" is a short label for which part of the case this fills in (e.g. "History of Present Illness", "Agni", "Ahara-Vihara"). "reason" is one short sentence explaining, for the practitioner's reference only, why this question was asked (e.g. "Patient mentioned symptoms occur after meals but did not specify timing."). For "text" or "slider", "options" must be an empty array. For "yes_no", options must be exactly ["Yes","No"]. Keep options short (a few words each) and offer at most 5.`;

  try {
    const result = await withTimeout(model.generateContent(prompt), TIMEOUT_MS);
    const text = result.response.text().trim();
    if (!text || text.toUpperCase() === "DONE") return null;

    try {
      const parsed = JSON.parse(stripCodeFence(text));
      if (parsed && typeof parsed.question === "string" && parsed.question.trim()) {
        const type: FollowUpResponseType = VALID_RESPONSE_TYPES.includes(parsed.type) ? parsed.type : "text";
        const options = Array.isArray(parsed.options) ? parsed.options.filter((o: unknown) => typeof o === "string") : [];
        return {
          question: parsed.question.trim(),
          type,
          options,
          section: typeof parsed.section === "string" && parsed.section.trim() ? parsed.section.trim() : "Follow-up",
          reason: typeof parsed.reason === "string" ? parsed.reason.trim() : "",
        };
      }
    } catch {
      // Not valid JSON — fall through to the backward-compatible plain-text path below.
    }

    return { question: text.replace(/^["']|["']$/g, ""), type: "text", options: [], section: "Follow-up", reason: "" };
  } catch {
    return null;
  }
}

/**
 * Returns an AI-organized narrative of the case, or null if Gemini is
 * unavailable/errors/times out. The rule-based case sheet (summaryEngine.ts)
 * is always the source of truth for the practitioner — this is a
 * best-effort enrichment layer only, never a replacement, and never a
 * diagnosis or treatment suggestion.
 */
export async function getClinicalNarrative(params: {
  history: ClinicalHistory;
  documents: DocumentRecord[];
}): Promise<string | null> {
  const model = getModel();
  if (!model) return null;

  const { history, documents } = params;
  const prompt = `${SAFETY_RULES}

Organize a concise, factual case note for a practitioner, using ONLY the information provided below. Do not invent any information that isn't present. Do not infer or state a diagnosis. Do not recommend treatment or medication. Do not assign a severity, risk, or priority level.

Chief complaint(s): ${history.chiefComplaintLabel}
Structured answers (HPI, AYUSH info, Ahara-Vihara, medical history): ${JSON.stringify(history.answers)}
Family medical history: ${JSON.stringify(history.familyHistory || [])}
Follow-up questions and answers: ${JSON.stringify(history.aiFollowUp || [])}
Uploaded documents: ${JSON.stringify(documents.map((d) => ({ type: d.documentType, fields: d.fields })))}

Organize into short labeled sections where information is available (Chief Complaint, History of Present Illness, AYUSH Case Information, Ahara-Vihara, Relevant Medical History, Family Medical History, Follow-up Findings). Omit sections with no information rather than guessing. Keep it factual and concise — this is what the patient reported, not a clinical conclusion.`;

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
    const raw = stripCodeFence(result.response.text().trim());
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

export interface DocumentExtractionResult {
  documentType: string;
  date: string;
  facility: string;
  fields: ExtractedField[];
}

/**
 * Digitizes a patient-uploaded medical document (prescription, lab report,
 * discharge summary, etc.) from an image via Gemini vision. This is ALWAYS
 * a draft — the caller must show it as "Review Extracted Information" and
 * let the patient/practitioner confirm, edit, or reject it before it's
 * treated as part of the case (PS26047 section 11). Returns null if Gemini
 * is unavailable/errors/times out so the caller can fall back to the demo
 * mock, clearly labeled as such.
 */
export async function extractDocumentFields(imageBase64: string, mimeType: string): Promise<DocumentExtractionResult | null> {
  const model = getModel(VISION_MODEL);
  if (!model) return null;

  const prompt = `You are digitizing a patient's previous medical document (a prescription, lab/investigation report, or discharge summary) from an image, for a practitioner to review before a consultation.
Transcribe only what is clearly visible. Do NOT infer, complete, or guess any value you cannot clearly read — if a value is unclear or partially visible, wrap that portion in [[double brackets]] instead of guessing. Do not add a diagnosis, medication, or interpretation that is not explicitly written on the document.

Respond with ONLY a JSON object in exactly this shape, no markdown, no other text:
{"documentType": "Prescription" | "Lab Report" | "Discharge Summary" | "Other", "date": "as printed on the document, or empty string if not visible", "facility": "hospital/clinic/doctor name if visible, or empty string", "fields": [{"key": "...", "value": "...", "flagForReview": true|false}]}

Each entry in "fields" should be one clearly labeled piece of information from the document (e.g. "Diagnosis", "Medications", "Hemoglobin", "HbA1c"). Set "flagForReview": true only for a lab value that looks numerically outside a typical healthy range, so the practitioner double-checks it — never as a diagnosis or urgency judgment. If the image doesn't look like a medical document, return {"documentType": "Other", "date": "", "facility": "", "fields": []}.`;

  try {
    const result = await withTimeout(
      model.generateContent([{ inlineData: { data: imageBase64, mimeType } }, { text: prompt }]),
      EXTRACT_TIMEOUT_MS
    );
    const raw = stripCodeFence(result.response.text().trim());
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const fields: ExtractedField[] = Array.isArray(parsed.fields)
      ? parsed.fields
          .filter((f: any) => f && typeof f.key === "string" && typeof f.value === "string")
          .map((f: any) => ({ key: f.key, value: f.value, flagForReview: !!f.flagForReview }))
      : [];
    return {
      documentType: typeof parsed.documentType === "string" && parsed.documentType ? parsed.documentType : "Other",
      date: typeof parsed.date === "string" ? parsed.date : "",
      facility: typeof parsed.facility === "string" ? parsed.facility : "",
      fields,
    };
  } catch (err) {
    console.error("[extract-document] error:", err);
    return null;
  }
}

/**
 * Best-effort mapping of a spoken transcript onto a structured answer for
 * the given field (PS26047 section 9). The result is ALWAYS shown back to
 * the patient for confirmation before being saved — never trusted silently.
 * Returns null if Gemini can't confidently map it, in which case the caller
 * should fall back to showing the raw transcript for the patient to edit.
 */
export async function interpretVoiceAnswer(
  transcript: string,
  field: Pick<InterviewField, "type" | "question" | "options">
): Promise<{ value: string | string[] | number } | null> {
  if (field.type === "text") return { value: transcript.trim() };

  const model = getModel();
  if (!model) return null;

  const prompt = `A patient answered a question by speaking. Map their spoken answer onto the structured answer format for this question. Do not add information they didn't say.

Question: ${field.question}
Answer type: ${field.type}
${field.options?.length ? `Available options: ${JSON.stringify(field.options)}` : ""}
Patient said: "${transcript}"

${
  field.type === "slider"
    ? 'Respond with ONLY JSON: {"value": <integer 0-10>} based on what they said, or {"value": null} if you cannot determine a number.'
    : field.type === "multi"
      ? 'Respond with ONLY JSON: {"value": ["option", ...]} using only the exact option strings from the list above that match what they said, or {"value": null} if none clearly match.'
      : 'Respond with ONLY JSON: {"value": "option"} using the exact option string from the list above that best matches what they said, or {"value": null} if none clearly match.'
}
No markdown, no other text.`;

  try {
    const result = await withTimeout(model.generateContent(prompt), TIMEOUT_MS);
    const raw = stripCodeFence(result.response.text().trim());
    const parsed = JSON.parse(raw);
    if (parsed.value === null || parsed.value === undefined) return null;
    return { value: parsed.value };
  } catch {
    return null;
  }
}
