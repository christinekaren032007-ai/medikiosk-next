import { PatientRecord } from "@/types/patient";

export function rowToPatient(row: any): PatientRecord {
  return {
    id: row.id,
    name: row.name,
    age: row.age === "—" ? "—" : Number(row.age),
    gender: row.gender,
    abhaId: row.abha_id,
    token: row.token,
    history: row.history,
    documents: row.documents,
    timeline: row.timeline,
    caseSheet: row.case_sheet,
    doctorReview: row.doctor_review,
    consent: row.consent,
    aiStatus: row.ai_status,
    status: row.status,
    createdAt: row.created_at,
    consultation: row.consultation ?? null,
    treatmentFollowups: row.treatment_followups ?? [],
  };
}

export function patientToRow(record: PatientRecord) {
  return {
    id: record.id,
    token: record.token,
    name: record.name,
    age: String(record.age),
    gender: record.gender,
    abha_id: record.abhaId,
    status: record.status,
    ai_status: record.aiStatus,
    history: record.history,
    documents: record.documents,
    timeline: record.timeline,
    case_sheet: record.caseSheet,
    doctor_review: record.doctorReview,
    consent: record.consent,
    treatment_followups: record.treatmentFollowups ?? [],
    created_at: record.createdAt,
  };
}
