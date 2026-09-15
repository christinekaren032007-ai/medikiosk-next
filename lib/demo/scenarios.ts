import { ComplaintKey, InterviewAnswers } from "@/types/clinical";

export interface ScenarioPreset {
  keys: ComplaintKey[];
  name: string;
  age: number;
  gender: "Male" | "Female";
  abhaId: string;
  answers: InterviewAnswers;
}

const COMMON_LIFESTYLE = {
  mealTiming: "Somewhat regular",
  waterIntake: "4-8 glasses",
  dailyRoutine: "Somewhat structured",
  yogaMeditation: "Occasionally",
};

// Demo scenarios (PS26047 section 27) — clearly fictional patients spanning
// several complaints so the app doesn't look like it supports only one
// condition. Loaded from the Demo Controls panel to skip straight to the
// review screen with realistic pre-filled AYUSH case data.
export const SCENARIOS: Record<"fever" | "joint_pain" | "digestive" | "headache", ScenarioPreset> = {
  fever: {
    keys: ["fever"], name: "Lakshmi Iyer", age: 45, gender: "Female", abhaId: "XX-XXXX-XXXX-4471",
    answers: {
      onset: "2-3 days ago", location: "Not applicable, whole body", character: "Low-grade, comes with chills in the evening", severity: 5,
      frequency: "Constant / ongoing", progression: "Staying the same", aggravating: ["Cold weather"], relieving: ["Rest", "Medication"],
      associatedSymptoms: ["Fatigue", "Loss of appetite"], previousEpisodes: "No, this is new",
      prakriti: "Warm, sharp appetite, medium build (Pitta type)", vikriti: "More irritable / overheated than usual",
      agni: "Strong, sometimes excessive", kostha: "Loose / frequent", nidana: "Weather changes",
      foodHabits: "Balanced, varied diet", sleepPattern: "Difficulty falling asleep", physicalActivity: "Light activity",
      ...COMMON_LIFESTYLE,
      pastConditions: "None", currentMedications: "None", allergies: "None known", previousTreatment: "None",
    },
  },
  joint_pain: {
    keys: ["joint_pain"], name: "Ravi Kumar", age: 58, gender: "Male", abhaId: "XX-XXXX-XXXX-1189",
    answers: {
      onset: "More than 2 weeks ago", location: "Both knees", character: "Dull, stiff in the mornings", severity: 6,
      frequency: "Several times a day", progression: "Getting worse", aggravating: ["Cold weather", "Physical activity"], relieving: ["Warm food or drink", "Rest"],
      associatedSymptoms: ["None"], previousEpisodes: "Yes, this is ongoing / long-term",
      prakriti: "Steady, calm, solid build (Kapha type)", vikriti: "More sluggish / heavy than usual",
      agni: "Slow, heavy after meals", kostha: "Regular and well-formed", nidana: "Weather changes",
      foodHabits: "Heavy, regular meals", sleepPattern: "Sound and sufficient", physicalActivity: "Sedentary (little movement)",
      ...COMMON_LIFESTYLE,
      pastConditions: "Type 2 diabetes (on medication)", currentMedications: "Metformin 500 mg", allergies: "None known", previousTreatment: "Physiotherapy, 2025",
    },
  },
  digestive: {
    keys: ["digestive"], name: "Priya S", age: 31, gender: "Female", abhaId: "XX-XXXX-XXXX-3390",
    answers: {
      onset: "About a week ago", location: "Upper abdomen", character: "Burning sensation after meals", severity: 4,
      frequency: "Once a day", progression: "Staying the same", aggravating: ["Certain foods", "Stress"], relieving: ["Warm food or drink"],
      associatedSymptoms: ["Loss of appetite"], previousEpisodes: "Yes, a few times before",
      prakriti: "Warm, sharp appetite, medium build (Pitta type)", vikriti: "No noticeable change",
      agni: "Irregular / variable", kostha: "Dry / irregular", nidana: "Certain foods",
      foodHabits: "Spicy / oily food often", sleepPattern: "Sound and sufficient", physicalActivity: "Moderately active",
      ...COMMON_LIFESTYLE,
      pastConditions: "None", currentMedications: "Antacid, occasionally", allergies: "None known", previousTreatment: "None",
    },
  },
  headache: {
    keys: ["headache"], name: "Arun Kumar", age: 67, gender: "Male", abhaId: "XX-XXXX-XXXX-2245",
    answers: {
      onset: "Yesterday", location: "Forehead and temples", character: "Throbbing", severity: 5,
      frequency: "A few times a week", progression: "Getting worse", aggravating: ["Stress"], relieving: ["Rest", "Medication"],
      associatedSymptoms: ["Sleep disturbance"], previousEpisodes: "Yes, a few times before",
      prakriti: "Light, quick-moving, gets cold easily (Vata type)", vikriti: "More restless / anxious than usual",
      agni: "Balanced", kostha: "Varies a lot", nidana: "Stress or irregular routine",
      foodHabits: "Light and irregular meals", sleepPattern: "Frequent waking", physicalActivity: "Light activity",
      ...COMMON_LIFESTYLE,
      pastConditions: "Hypertension", currentMedications: "Amlodipine 5 mg", allergies: "None known", previousTreatment: "None",
    },
  },
};
