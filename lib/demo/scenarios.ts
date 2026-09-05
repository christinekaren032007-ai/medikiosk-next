import { ComplaintCategory, InterviewAnswers } from "@/types/clinical";

export interface ScenarioPreset {
  key: ComplaintCategory;
  name: string;
  age: number;
  gender: "Male" | "Female";
  abhaId: string;
  ccLabel: string;
  answers: InterviewAnswers;
}

// The primary judge demo (section 12 / 46 of the brief): Ravi Kumar, chest pain,
// severe + breathlessness -> triggers the red-flag workflow.
export const SCENARIOS: Record<"chest_pain" | "fever" | "diabetes" | "ayush", ScenarioPreset> = {
  chest_pain: {
    key: "chest_pain", name: "Ravi Kumar", age: 52, gender: "Male", abhaId: "XX-XXXX-XXXX-1189", ccLabel: "Chest pain",
    answers: { onset: "Yesterday", location: "Center of chest", character: "Pressure", radiation: "Left arm", severity: 7, associated: ["Shortness of breath", "Sweating"] },
  },
  fever: {
    key: "fever", name: "Arun Kumar", age: 67, gender: "Male", abhaId: "XX-XXXX-XXXX-2245", ccLabel: "Fever",
    answers: { onset: "2-3 days", intensity: "High", associated: ["Chills", "Body ache"], severity: 5 },
  },
  diabetes: {
    key: "diabetes", name: "Priya S", age: 31, gender: "Female", abhaId: "XX-XXXX-XXXX-3390", ccLabel: "Follow-up / fatigue",
    answers: { reason: "Feeling more tired than usual", adherence: "Sometimes miss a dose", diet: "Some lapses", severity: 4 },
  },
  ayush: {
    key: "ayush", name: "Lakshmi Iyer", age: 45, gender: "Female", abhaId: "XX-XXXX-XXXX-4471", ccLabel: "General wellness (Ayurveda)",
    answers: {
      prakriti: "Warm, sharp appetite, medium build (Pitta type)", vikriti: "More irritable / overheated than usual",
      agni: "Strong, sometimes excessive", koshtha: "Loose, frequent", ahara: "Spicy / oily food often",
      vihara: "Active but irregular sleep", nidana: "Stress or irregular routine", sara: "Feel average",
      samhanana: "Medium, proportionate", pramana: "Average", satmya: "Warm, moist environments",
      sattva: "Balanced, manageable", aharaShakti: "Strong appetite", vyayamaShakti: "Moderate capacity",
      vaya: "Middle / stable stage", severity: 3,
    },
  },
};
