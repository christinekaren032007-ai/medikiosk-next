import { GoogleGenerativeAI } from "@google/generative-ai";
import { ClinicalHistory, FamilyHistoryEntry, FollowUpQuestion, FollowUpResponseType } from "@/types/clinical";
import { DocumentRecord } from "@/types/document";

const VALID_RESPONSE_TYPES: FollowUpResponseType[] = ["yes_no", "single_select", "multi_select", "slider", "short_text"];
const SELECT_TYPES: FollowUpResponseType[] = ["single_select", "multi_select"];

const MODEL = "gemini-3.6-flash";
const TIMEOUT_MS = 15000;
const NARRATIVE_TIMEOUT_MS = 18000;
const TRANSCRIBE_TIMEOUT_MS = 25000;
export const MAX_FOLLOW_UP_QUESTIONS = 3;

export const AI_SUMMARY_DISCLAIMER = "AI-generated summary — not a diagnosis. Final assessment is made by the physician.";

const SAFETY_RULES = `You are a clinical intake assistant helping gather information for AYUSH (Ayurveda, Yoga, Unani, Siddha, Homeopathy) case-taking, BEFORE the patient sees a physician.
You must NEVER diagnose a disease, predict a diagnosis, prescribe medication, recommend medication, recommend treatment, or calculate any emergency/priority/urgency score.
You only ask short, relevant follow-up questions to gather more information, or organize/summarize information the patient has already provided.
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
 * Parses and validates Gemini's raw text response for the follow-up
 * questions prompt into a clean array of FollowUpQuestion. Exported as a
 * pure function (no network call) so the schema-validation/sanitization
 * logic can be exercised directly in tests without a live Gemini call.
 * Throws if the response isn't recoverable JSON in the expected shape.
 */
export function parseFollowUpQuestionsResponse(rawText: string): FollowUpQuestion[] {
  const text = rawText.trim();
  if (!text || text.toUpperCase() === "DONE") return [];

  const cleaned = text.replace(/^```json\s*|^```\s*|```\s*$/g, "").trim();
  const parsed = JSON.parse(cleaned);
  const rawQuestions = Array.isArray(parsed?.questions) ? parsed.questions : [];

  const questions: FollowUpQuestion[] = [];
  for (const q of rawQuestions) {
    if (!q || typeof q.question !== "string" || !q.question.trim()) continue;
    const type: FollowUpResponseType = VALID_RESPONSE_TYPES.includes(q.type) ? q.type : "short_text";
    const rawOptions = Array.isArray(q.options) ? q.options.filter((o: unknown) => typeof o === "string" && o.trim()) : [];
    const options = SELECT_TYPES.includes(type) ? rawOptions.slice(0, 6) : [];
    const required = typeof q.required === "boolean" ? q.required : true;
    questions.push({ question: q.question.trim(), type, options, required });
    if (questions.length >= MAX_FOLLOW_UP_QUESTIONS) break;
  }
  return questions;
}

/**
 * Asks Gemini for 1-3 adaptive AYUSH case-taking follow-up questions based
 * on the complaint-specific answers already collected, in one call. Returns
 * a clear `error` string (never fake questions) whenever Gemini is
 * unconfigured, unreachable, times out, or replies with something that
 * can't be parsed as the expected schema — callers must surface this to
 * the user rather than silently continuing as if nothing happened.
 */
export async function getFollowUpQuestions(params: {
  chiefComplaintLabel: string;
  answers: Record<string, unknown>;
  familyHistory?: FamilyHistoryEntry[];
  noFamilyHistory?: boolean;
}): Promise<{ questions: FollowUpQuestion[]; error: string | null }> {
  const model = getModel();
  if (!model) return { questions: [], error: "Gemini is not configured on the server (missing GEMINI_API_KEY)." };

  const familyHistoryText = params.noFamilyHistory
    ? "None reported."
    : params.familyHistory?.length
      ? JSON.stringify(params.familyHistory)
      : "Not yet reported.";

  const prompt = `${SAFETY_RULES}

Chief complaint: ${params.chiefComplaintLabel}
Information already collected from the structured intake form: ${JSON.stringify(params.answers)}
Family medical history: ${familyHistoryText}

Generate 1 to 3 short, relevant follow-up questions to gather additional useful information for the doctor's AYUSH case-taking, based ONLY on what hasn't already been covered by the information above.
Do not repeat any question whose information is already collected above. Do not ask about anything unrelated to the chief complaint. Do not diagnose. Do not recommend medicines or treatment. Do not calculate an emergency or priority score.
If nothing useful remains to ask, return an empty "questions" array.

Allowed "type" values, and how to fill the other fields for each:
- "yes_no": a yes/no question. "options" must be [].
- "single_select": the patient picks exactly one option. "options" must contain the choices.
- "multi_select": the patient may pick more than one option. "options" must contain the choices.
- "slider": a 0-10 rating/severity style question. "options" must be [].
- "short_text": only when there's no natural fixed set of options. "options" must be [].

Set "required" to true unless the question is genuinely optional/supplementary.

Respond with ONLY a JSON object in exactly this shape, no markdown, no other text:
{"questions": [{"question": "...", "type": "yes_no" | "single_select" | "multi_select" | "slider" | "short_text", "options": ["..."], "required": true}]}

Keep options short (a few words each) and offer at most 5 per question. Maximum 3 questions total.`;

  try {
    const result = await withTimeout(model.generateContent(prompt), TIMEOUT_MS);
    const text = result.response.text();
    return { questions: parseFollowUpQuestionsResponse(text), error: null };
  } catch (err) {
    return { questions: [], error: `Gemini follow-up request failed: ${err instanceof Error ? err.message : "unknown error"}` };
  }
}

/**
 * Ensures the mandated disclaimer is present verbatim in an AI-generated
 * summary, regardless of whether the model included it (or phrased it
 * differently) on its own — this must never depend on the model reliably
 * following instructions.
 */
function withDisclaimer(text: string): string {
  return text.includes(AI_SUMMARY_DISCLAIMER) ? text : `${text}\n\n${AI_SUMMARY_DISCLAIMER}`;
}

/**
 * Generates the AI case summary for a completed consultation: a concise,
 * structured, doctor-facing organization of everything Rapha collected —
 * never a diagnosis, treatment recommendation, or priority/urgency
 * classification. Returns a clear `error` (never a fabricated summary)
 * when Gemini is unconfigured, unreachable, times out, or fails.
 */
export async function getCaseSummary(params: {
  patient: { name: string; age: number | "—"; gender: string };
  history: ClinicalHistory;
  documents: DocumentRecord[];
}): Promise<{ narrative: string | null; error: string | null }> {
  const model = getModel();
  if (!model) return { narrative: null, error: "Gemini is not configured on the server (missing GEMINI_API_KEY)." };

  const { patient, history, documents } = params;
  const prompt = `${SAFETY_RULES}

Write a concise, structured case summary for a doctor, using ONLY the information provided below. Do not invent any information that isn't present. Do not infer or state a diagnosis. Do not recommend treatment or medication. Do not calculate or mention any emergency/priority/urgency score.

Patient details: ${JSON.stringify(patient)}
Chief complaint: ${history.chiefComplaintLabel}
Structured intake answers: ${JSON.stringify(history.answers)}
Family medical history: ${JSON.stringify(history.familyHistory || [])}
AI follow-up questions and answers: ${JSON.stringify(history.aiFollowUp || [])}
AYUSH assessment — Trividha Pariksha, patient-reported (Darshana/observed, Sparshana/touch, Prashna/additional notes): ${JSON.stringify(history.ayushAssessment || null)}
Dashavidha Pariksha fields, when this is an AYUSH-category visit (already included in the structured intake answers above where present, e.g. prakriti, agni, koshtha, nidana, etc.): see "Structured intake answers" above.
Returning patient with previous records used: ${history.returningPatient && history.previousRecordUsed ? "yes" : "no"}
Relevant previous records / uploaded documents: ${JSON.stringify(documents.map((d) => ({ type: d.documentType, fields: d.fields })))}

Organize the summary into short labeled sections, using only the sections where information is actually available (Patient Details, Chief Complaint, History of Present Illness, Family Medical History, AYUSH Assessment — Trividha Pariksha, Dashavidha Pariksha, Follow-up Findings, Relevant Previous Records). Omit sections with no information rather than guessing. Keep it factual and concise — this is for a doctor to quickly review, not a patient-facing document. Do not add your own disclaimer text; one will be appended automatically.`;

  try {
    const result = await withTimeout(model.generateContent(prompt), NARRATIVE_TIMEOUT_MS);
    const text = result.response.text().trim();
    if (!text) return { narrative: null, error: "Gemini returned an empty response." };
    return { narrative: withDisclaimer(text), error: null };
  } catch (err) {
    return { narrative: null, error: `Gemini case summary request failed: ${err instanceof Error ? err.message : "unknown error"}` };
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
