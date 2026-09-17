import { supabaseServer } from "@/lib/supabase/server";
import { getFlow } from "@/lib/ai/historyEngine";
import { buildSummary } from "@/lib/ai/summaryEngine";
import { getCaseSummary } from "@/lib/ai/gemini";
import { ClinicalHistory, ComplaintCategory, FamilyHistoryEntry, FollowUpQA, InterviewAnswers } from "@/types/clinical";
import { DraftPatient, PatientRecord } from "@/types/patient";
import { AISummary, Consultation, Medicine } from "@/types/ai";
import { DocumentRecord, TimelineEvent } from "@/types/document";
import { uid, nextToken } from "@/lib/utils/id";

/**
 * Data-access layer for the normalized clinical schema (see
 * supabase/migrations/20260918000000_normalize_clinical_schema.sql).
 *
 * Everything here reconstructs/consumes the same `PatientRecord` /
 * `ClinicalHistory` shapes the UI already used against the old flat
 * jsonb-blob table, so the doctor dashboard and patient pages need no
 * redesign — only this layer and the route handlers change.
 */

const NO_FAMILY_HISTORY_QUESTION = "Family history";

const DASHAVIDHA_FIELD_IDS = [
  "prakriti", "vikriti", "agni", "koshtha", "ahara", "vihara", "nidana",
  "sara", "samhanana", "pramana", "satmya", "sattva", "aharaShakti", "vyayamaShakti", "vaya",
];

/** PostgREST returns a to-one embed as an object or an array depending on
 * version/relationship inference — normalize either shape to one row. */
function one<T>(x: T | T[] | null | undefined): T | null {
  if (Array.isArray(x)) return (x[0] as T) ?? null;
  return (x as T) ?? null;
}

// ---------------------------------------------------------------------
// Writing a submitted kiosk draft into the normalized schema
// ---------------------------------------------------------------------

/**
 * Finds an existing patient by their (simulated) demo ABHA id for a
 * returning patient, or creates a new patient row. This is the only
 * "reuse" heuristic in the prototype — there is no real identity system.
 */
export async function findOrCreatePatientId(draft: DraftPatient, language: string): Promise<string> {
  if (draft.returningPatient && draft.abhaId) {
    const { data: existing, error } = await supabaseServer
      .from("patients")
      .select("id")
      .eq("demo_abha_id", draft.abhaId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (existing) return existing.id;
  }

  const { data, error } = await supabaseServer
    .from("patients")
    .insert({
      name: draft.name,
      age: draft.age === "—" ? null : Number(draft.age),
      gender: draft.gender,
      language,
      new_or_returning: draft.returningPatient ? "returning" : "new",
      demo_abha_id: draft.abhaId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

interface IntakeAnswerRow {
  question: string;
  answer: unknown;
  answer_type: string;
}

function buildIntakeAnswerRows(
  category: ComplaintCategory,
  answers: InterviewAnswers,
  familyHistory: FamilyHistoryEntry[] | undefined,
  noFamilyHistory: boolean | undefined
): IntakeAnswerRow[] {
  const rows: IntakeAnswerRow[] = [];
  for (const field of getFlow(category)) {
    const value = answers[field.id];
    if (value === undefined || value === "") continue;
    rows.push({ question: field.question, answer: value, answer_type: field.type });
  }
  if (noFamilyHistory) {
    rows.push({ question: NO_FAMILY_HISTORY_QUESTION, answer: true, answer_type: "family_history_none" });
  } else {
    for (const entry of familyHistory || []) {
      rows.push({
        question: `Family history: ${entry.condition}`,
        answer: { relation: entry.relation ?? null, details: entry.details ?? null },
        answer_type: "family_history",
      });
    }
  }
  return rows;
}

function buildDashavidha(category: ComplaintCategory, answers: InterviewAnswers): Record<string, unknown> | null {
  if (category !== "ayush") return null;
  const out: Record<string, unknown> = {};
  for (const id of DASHAVIDHA_FIELD_IDS) if (answers[id] !== undefined) out[id] = answers[id];
  return out;
}

/**
 * Inserts one full consultation (consultation row, intake answers, AYUSH
 * assessment, AI summary) for an already-resolved patient. Used both for
 * a real kiosk submission and for seeding demo patients.
 */
export async function insertConsultationTree(params: {
  patientId: string;
  draft: DraftPatient;
  aiStatus?: "processing" | "ready";
}): Promise<{ consultationId: string; token: string; summary: AISummary; history: ClinicalHistory }> {
  const { patientId, draft, aiStatus = "processing" } = params;

  const { count } = await supabaseServer.from("consultations").select("*", { count: "exact", head: true });
  const token = nextToken(count || 0);

  const { data: consultationRow, error: consultationError } = await supabaseServer
    .from("consultations")
    .insert({
      patient_id: patientId,
      token,
      chief_complaint: draft.chiefComplaintLabel,
      chief_complaint_category: draft.chiefComplaintCategory,
      consent_given: true,
      consent_timestamp: new Date().toISOString(),
      ai_status: aiStatus,
      documents: draft.documents,
    })
    .select("id")
    .single();
  if (consultationError) throw new Error(consultationError.message);
  const consultationId: string = consultationRow.id;

  const answerRows = buildIntakeAnswerRows(draft.chiefComplaintCategory, draft.answers, draft.familyHistory, draft.noFamilyHistory);
  if (answerRows.length) {
    const { error } = await supabaseServer
      .from("intake_answers")
      .insert(answerRows.map((r) => ({ consultation_id: consultationId, ...r })));
    if (error) throw new Error(error.message);
  }

  if (draft.ayushAssessment) {
    const { error } = await supabaseServer.from("ayush_assessments").insert({
      consultation_id: consultationId,
      darshana: draft.ayushAssessment.darshana,
      sparshana: draft.ayushAssessment.sparshana,
      prashna: draft.ayushAssessment.prashna,
      dashavidha: buildDashavidha(draft.chiefComplaintCategory, draft.answers),
    });
    if (error) throw new Error(error.message);
  }

  const history: ClinicalHistory = {
    chiefComplaintCategory: draft.chiefComplaintCategory,
    chiefComplaintLabel: draft.chiefComplaintLabel,
    answers: draft.answers,
    familyHistory: draft.familyHistory || [],
    noFamilyHistory: draft.noFamilyHistory || false,
    aiFollowUp: draft.aiFollowUp || [],
    ayushAssessment: draft.ayushAssessment,
    returningPatient: draft.returningPatient || false,
    previousRecordUsed: draft.previousRecordUsed || false,
  };
  const summary = buildSummary(history, draft.documents);

  const { error: summaryError } = await supabaseServer.from("ai_summaries").insert({
    consultation_id: consultationId,
    summary,
    follow_up_questions: draft.aiFollowUp || [],
  });
  if (summaryError) throw new Error(summaryError.message);

  return { consultationId, token, summary, history };
}

export async function markAiSummaryReady(consultationId: string, summary: AISummary) {
  await supabaseServer.from("ai_summaries").update({ summary }).eq("consultation_id", consultationId);
  await supabaseServer.from("consultations").update({ ai_status: "ready" }).eq("id", consultationId);
}

// ---------------------------------------------------------------------
// Reading consultations back out (doctor dashboard + patient treatment)
// ---------------------------------------------------------------------

const CONSULTATION_SELECT = `
  id, patient_id, token, chief_complaint, chief_complaint_category,
  consent_given, consent_timestamp, consultation_status, ai_status, documents,
  created_at, updated_at,
  patients ( name, age, gender, demo_abha_id, new_or_returning ),
  intake_answers ( question, answer, answer_type ),
  ayush_assessments ( darshana, sparshana, prashna ),
  ai_summaries ( summary, follow_up_questions, confirmed, confirmed_at ),
  doctor_assessments ( diagnosis, doctor_notes, additional_instructions, updated_at ),
  prescriptions ( medicine_name, dosage, frequency, duration )
`;

function reconstructAnswers(category: ComplaintCategory, rows: { question: string; answer: unknown; answer_type: string }[]) {
  const flow = getFlow(category);
  const answers: InterviewAnswers = {};
  const familyHistory: FamilyHistoryEntry[] = [];
  let noFamilyHistory = false;
  for (const row of rows) {
    if (row.answer_type === "family_history_none") {
      noFamilyHistory = true;
      continue;
    }
    if (row.answer_type === "family_history") {
      const condition = row.question.replace(/^Family history: /, "");
      const detail = (row.answer || {}) as { relation?: string; details?: string };
      familyHistory.push({ condition, relation: detail.relation ?? undefined, details: detail.details ?? undefined });
      continue;
    }
    const field = flow.find((f) => f.question === row.question);
    if (field) answers[field.id] = row.answer as string | string[] | number;
  }
  return { answers, familyHistory, noFamilyHistory };
}

function joinedRowToPatientRecord(row: any): PatientRecord {
  const patient = one<any>(row.patients) || {};
  const aiSummaryRow = one<any>(row.ai_summaries);
  const doctorAssessmentRow = one<any>(row.doctor_assessments);
  const ayushRow = one<any>(row.ayush_assessments);
  const category: ComplaintCategory = row.chief_complaint_category;

  const { answers, familyHistory, noFamilyHistory } = reconstructAnswers(category, row.intake_answers || []);

  const history: ClinicalHistory = {
    chiefComplaintCategory: category,
    chiefComplaintLabel: row.chief_complaint,
    answers,
    familyHistory,
    noFamilyHistory,
    aiFollowUp: (aiSummaryRow?.follow_up_questions as FollowUpQA[]) || [],
    ayushAssessment: ayushRow ? { darshana: ayushRow.darshana || [], sparshana: ayushRow.sparshana || "", prashna: ayushRow.prashna || "" } : undefined,
    returningPatient: patient.new_or_returning === "returning",
    previousRecordUsed: patient.new_or_returning === "returning",
  };

  const summary: AISummary = (aiSummaryRow?.summary as AISummary) || {
    chiefComplaint: row.chief_complaint,
    hpi: "Not reported.",
    pastHistory: "Not reported by patient.",
    medications: "None reported.",
    allergies: "No known drug allergies reported.",
    investigations: "None uploaded.",
    generatedAt: row.created_at,
  };

  const medicines: Medicine[] = (row.prescriptions || []).map((rx: any) => ({
    name: rx.medicine_name,
    dosage: rx.dosage || "",
    frequency: rx.frequency || "",
    duration: rx.duration || "",
  }));

  const consultation: Consultation | null = doctorAssessmentRow
    ? {
        diagnosis: doctorAssessmentRow.diagnosis || "",
        medicines,
        additionalInstructions: doctorAssessmentRow.additional_instructions || "",
        doctorNotes: doctorAssessmentRow.doctor_notes || "",
        completedAt: doctorAssessmentRow.updated_at,
      }
    : null;

  const createdYear = new Date(row.created_at).getFullYear().toString();
  const timeline: TimelineEvent[] = [
    { id: uid(), year: createdYear, label: "Intake completed at kiosk" },
    ...((row.documents || []).length ? [{ id: uid(), year: createdYear, label: `${row.documents[0].documentType} uploaded` }] : []),
    ...(row.consultation_status === "Completed"
      ? [{ id: uid(), year: new Date(row.updated_at).getFullYear().toString(), label: "Consultation completed by doctor" }]
      : []),
  ];

  return {
    // The whole app keys off `PatientRecord.id` for routing and API calls —
    // that identifier is the consultation id (one row per kiosk visit),
    // not the underlying patient id (which a returning patient can share
    // across visits).
    id: row.id,
    name: patient.name ?? "Guest Patient",
    age: patient.age ?? "—",
    gender: patient.gender ?? "—",
    abhaId: patient.demo_abha_id ?? null,
    token: row.token,
    history,
    documents: row.documents || [],
    timeline,
    summary,
    redFlag: { triggered: false, reason: null },
    doctorReview: {
      confirmed: !!aiSummaryRow?.confirmed,
      edited: false,
      reviewer: aiSummaryRow?.confirmed ? "Dr. On Duty" : null,
      timestamp: aiSummaryRow?.confirmed_at ?? null,
    },
    consent: { granted: !!row.consent_given, timestamp: row.consent_timestamp, consentTextVersion: "v1" },
    priority: "normal",
    aiStatus: row.ai_status,
    status: row.consultation_status,
    createdAt: row.created_at,
    consultation,
  };
}

export async function fetchConsultationRecord(consultationId: string): Promise<PatientRecord | null> {
  const { data, error } = await supabaseServer.from("consultations").select(CONSULTATION_SELECT).eq("id", consultationId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return joinedRowToPatientRecord(data);
}

export async function fetchQueueRecords(): Promise<PatientRecord[]> {
  const { data, error } = await supabaseServer.from("consultations").select(CONSULTATION_SELECT).order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map(joinedRowToPatientRecord);
}

// ---------------------------------------------------------------------
// Doctor-side writes
// ---------------------------------------------------------------------

export async function confirmAiSummary(consultationId: string) {
  const { error } = await supabaseServer
    .from("ai_summaries")
    .update({ confirmed: true, confirmed_at: new Date().toISOString() })
    .eq("consultation_id", consultationId);
  if (error) throw new Error(error.message);
}

export async function regenerateAiSummary(consultationId: string) {
  const { data, error: fetchError } = await supabaseServer
    .from("consultations")
    .select(
      "chief_complaint, chief_complaint_category, documents, patients ( name, age, gender ), intake_answers ( question, answer, answer_type ), ayush_assessments ( darshana, sparshana, prashna ), ai_summaries ( follow_up_questions )"
    )
    .eq("id", consultationId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const category: ComplaintCategory = data.chief_complaint_category;
  const { answers, familyHistory, noFamilyHistory } = reconstructAnswers(category, data.intake_answers || []);
  const aiSummaryRow = one<any>(data.ai_summaries);
  const ayushRow = one<any>(data.ayush_assessments);
  const patient = one<any>(data.patients) || {};
  const documents = (data.documents as DocumentRecord[]) || [];

  const history: ClinicalHistory = {
    chiefComplaintCategory: category,
    chiefComplaintLabel: data.chief_complaint,
    answers,
    familyHistory,
    noFamilyHistory,
    aiFollowUp: aiSummaryRow?.follow_up_questions || [],
    ayushAssessment: ayushRow ? { darshana: ayushRow.darshana || [], sparshana: ayushRow.sparshana || "", prashna: ayushRow.prashna || "" } : undefined,
  };
  const summary = buildSummary(history, documents);

  // Regeneration is a direct, doctor-initiated action awaiting a response,
  // so the AI case summary is generated synchronously here (unlike the
  // background enrichment at first submission) — a visible aiError is
  // saved on failure rather than silently keeping the old summary's AI text.
  const { narrative, error: aiError } = await getCaseSummary({
    patient: { name: patient.name ?? "Guest Patient", age: patient.age ?? "—", gender: patient.gender ?? "—" },
    history,
    documents,
  });

  const updatedSummary = narrative
    ? { ...summary, aiNarrative: narrative, aiGenerated: true, aiError: undefined }
    : { ...summary, aiGenerated: false, aiError: aiError || "Gemini did not return a summary." };

  const { error } = await supabaseServer
    .from("ai_summaries")
    .update({ summary: updatedSummary, confirmed: false, confirmed_at: null })
    .eq("consultation_id", consultationId);
  if (error) throw new Error(error.message);

  return { history, documents };
}

export async function saveDoctorAssessment(
  consultationId: string,
  input: { diagnosis: string; medicines: Medicine[]; additionalInstructions: string; doctorNotes: string }
) {
  const { error: daError } = await supabaseServer.from("doctor_assessments").upsert(
    {
      consultation_id: consultationId,
      diagnosis: input.diagnosis,
      doctor_notes: input.doctorNotes,
      additional_instructions: input.additionalInstructions,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "consultation_id" }
  );
  if (daError) throw new Error(daError.message);

  const { error: delError } = await supabaseServer.from("prescriptions").delete().eq("consultation_id", consultationId);
  if (delError) throw new Error(delError.message);

  const medicines = (input.medicines || []).filter((m) => m.name.trim() !== "");
  if (medicines.length) {
    const { error: insError } = await supabaseServer.from("prescriptions").insert(
      medicines.map((m) => ({
        consultation_id: consultationId,
        medicine_name: m.name,
        dosage: m.dosage || null,
        frequency: m.frequency || null,
        duration: m.duration || null,
      }))
    );
    if (insError) throw new Error(insError.message);
  }

  const { error: statusError } = await supabaseServer
    .from("consultations")
    .update({ consultation_status: "Completed", updated_at: new Date().toISOString() })
    .eq("id", consultationId);
  if (statusError) throw new Error(statusError.message);
}

// ---------------------------------------------------------------------
// Patient-facing treatment plan lookup (unauthenticated, minimal fields)
// ---------------------------------------------------------------------

export async function fetchTreatmentPlan(consultationId: string): Promise<{ name: string; token: string; consultation: Consultation | null } | null> {
  const { data, error } = await supabaseServer
    .from("consultations")
    .select(`
      token,
      patients ( name ),
      doctor_assessments ( diagnosis, doctor_notes, additional_instructions, updated_at ),
      prescriptions ( medicine_name, dosage, frequency, duration )
    `)
    .eq("id", consultationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const patient = one<any>(data.patients);
  const doctorAssessment = one<any>(data.doctor_assessments);
  if (!doctorAssessment) return { name: patient?.name ?? "Guest Patient", token: data.token, consultation: null };

  const medicines: Medicine[] = (data.prescriptions || []).map((rx: any) => ({
    name: rx.medicine_name,
    dosage: rx.dosage || "",
    frequency: rx.frequency || "",
    duration: rx.duration || "",
  }));

  return {
    name: patient?.name ?? "Guest Patient",
    token: data.token,
    consultation: {
      diagnosis: doctorAssessment.diagnosis || "",
      medicines,
      additionalInstructions: doctorAssessment.additional_instructions || "",
      doctorNotes: doctorAssessment.doctor_notes || "",
      completedAt: doctorAssessment.updated_at,
    },
  };
}
