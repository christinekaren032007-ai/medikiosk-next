import { GoogleGenerativeAI } from "@google/generative-ai";
import { ClinicalHistory, FollowUpQA } from "@/types/clinical";
import { DocumentRecord } from "@/types/document";

const MODEL = "gemini-3.6-flash";
const TIMEOUT_MS = 8000;
const NARRATIVE_TIMEOUT_MS = 18000;
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
}): Promise<string | null> {
  const model = getModel();
  if (!model) return null;
  if (params.priorFollowUp.length >= MAX_FOLLOW_UP_QUESTIONS) return null;

  const prompt = `${SAFETY_RULES}

Chief complaint: ${params.chiefComplaintLabel}
Information already collected from the structured intake form: ${JSON.stringify(params.answers)}
Follow-up questions already asked and answered in this conversation: ${JSON.stringify(params.priorFollowUp)}

Ask ONE short, relevant follow-up question to gather more useful information for the doctor, based on what hasn't been covered yet.
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
