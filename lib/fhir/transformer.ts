import { PatientRecord } from "@/types/patient";

/**
 * Produces a FHIR-shaped Bundle from a patient record for demo purposes.
 * This is NOT a validated FHIR resource and is not submitted anywhere —
 * it exists to visually demonstrate the intended data flow to ABDM/HIS.
 */
export function toFhirBundle(patient: PatientRecord) {
  return {
    resourceType: "Bundle",
    type: "collection",
    meta: { tag: [{ code: "DEMO", display: "Simulated — not a real ABDM submission" }] },
    entry: [
      {
        resource: {
          resourceType: "Patient",
          id: patient.id,
          name: [{ text: patient.name }],
          gender: patient.gender === "Male" ? "male" : patient.gender === "Female" ? "female" : "unknown",
          identifier: patient.abhaId ? [{ system: "https://abdm.gov.in/ABHA-demo", value: patient.abhaId }] : [],
        },
      },
      {
        resource: {
          resourceType: "Condition",
          subject: { reference: `Patient/${patient.id}` },
          code: { text: patient.summary.pastHistory },
        },
      },
      {
        resource: {
          resourceType: "Observation",
          status: "preliminary",
          subject: { reference: `Patient/${patient.id}` },
          code: { text: "Chief Complaint" },
          valueString: patient.summary.chiefComplaint,
        },
      },
      {
        resource: {
          resourceType: "MedicationStatement",
          subject: { reference: `Patient/${patient.id}` },
          medicationCodeableConcept: { text: patient.summary.medications },
        },
      },
      ...patient.documents.map((doc) => ({
        resource: {
          resourceType: "DocumentReference",
          subject: { reference: `Patient/${patient.id}` },
          type: { text: doc.documentType },
          date: doc.date,
          content: doc.fields.map((f) => ({ attachment: { title: f.key, data: f.value } })),
        },
      })),
    ],
  };
}
