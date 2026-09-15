import { ComplaintKey, InterviewField } from "@/types/clinical";

export const CHIEF_COMPLAINTS: { key: ComplaintKey; label: string }[] = [
  { key: "fever", label: "Fever" },
  { key: "cough", label: "Cough" },
  { key: "headache", label: "Headache" },
  { key: "joint_pain", label: "Joint pain" },
  { key: "back_pain", label: "Back pain" },
  { key: "digestive", label: "Gastric / digestive complaints" },
  { key: "skin", label: "Skin complaints" },
  { key: "menstrual", label: "Menstrual complaints" },
  { key: "fatigue", label: "Fatigue" },
  { key: "sleep", label: "Sleep-related complaints" },
  { key: "other", label: "Other" },
];

export function complaintLabel(keys: ComplaintKey[], otherText?: string): string {
  const labels = keys
    .filter((k) => k !== "other")
    .map((k) => CHIEF_COMPLAINTS.find((c) => c.key === k)?.label || k);
  if (keys.includes("other") && otherText?.trim()) labels.push(otherText.trim());
  else if (keys.includes("other")) labels.push("Other");
  return labels.length ? labels.join(", ") : "Not specified";
}

/**
 * HISTORY OF PRESENT ILLNESS — one shared, patient-friendly flow used for
 * every complaint (PS26047 section 5B). Deliberately generic rather than a
 * bespoke tree per complaint, per the brief's "avoid long medical forms"
 * guidance; Gemini's adaptive follow-ups (lib/ai/gemini.ts) fill in
 * anything complaint-specific afterward.
 */
export const HPI_FLOW: InterviewField[] = [
  { id: "onset", type: "choice", section: "hpi", question: "When did this start?", options: ["Today", "Yesterday", "2-3 days ago", "About a week ago", "More than 2 weeks ago", "Not sure"] },
  { id: "location", type: "text", section: "hpi", question: "Where do you feel it, if anywhere? (You can say 'not applicable')" },
  { id: "character", type: "text", section: "hpi", question: "How would you describe it, in your own words?" },
  { id: "severity", type: "slider", section: "hpi", question: "How severe is it, from 0 (none) to 10 (worst you can imagine)?" },
  { id: "frequency", type: "choice", section: "hpi", question: "How often does it happen?", options: ["Constant / ongoing", "Several times a day", "Once a day", "A few times a week", "Rarely"] },
  { id: "progression", type: "choice", section: "hpi", question: "Is it getting better, staying the same, or getting worse?", options: ["Getting better", "Staying the same", "Getting worse"] },
  { id: "aggravating", type: "multi", section: "hpi", question: "Does anything seem to make it worse?", options: ["Certain foods", "Cold weather", "Stress", "Physical activity", "Lying down", "Nothing noticed", "Other"] },
  { id: "relieving", type: "multi", section: "hpi", question: "Does anything make it feel better?", options: ["Rest", "Warm food or drink", "Medication", "Massage", "Nothing helps", "Other"] },
  { id: "associatedSymptoms", type: "multi", section: "hpi", question: "Are you noticing any of these along with it?", options: ["Fever", "Fatigue", "Nausea", "Loss of appetite", "Sleep disturbance", "Mood changes", "None"] },
  { id: "previousEpisodes", type: "choice", section: "hpi", question: "Have you had this problem before?", options: ["No, this is new", "Yes, a few times before", "Yes, this is ongoing / long-term"] },
];

/**
 * AYUSH CASE-TAKING — the central feature (PS26047 section 5). Always
 * collected for every patient; not an opt-in mode. Plain-language question
 * with the Ayurvedic term shown alongside, never presented as an AI
 * diagnosis — this is patient-reported information for the practitioner
 * to interpret.
 */
export const AYUSH_FLOW: InterviewField[] = [
  { id: "prakriti", type: "choice", section: "ayush", technicalTerm: "Prakriti", question: "How would you describe your usual body type and nature, on a normal day?", options: ["Light, quick-moving, gets cold easily (Vata type)", "Warm, sharp appetite, medium build (Pitta type)", "Steady, calm, solid build (Kapha type)", "Not sure"] },
  { id: "vikriti", type: "choice", section: "ayush", technicalTerm: "Vikriti", question: "How are you feeling different from your usual self recently?", options: ["More restless / anxious than usual", "More irritable / overheated than usual", "More sluggish / heavy than usual", "No noticeable change"] },
  { id: "agni", type: "choice", section: "ayush", technicalTerm: "Agni", question: "How is your digestion and appetite, usually?", options: ["Irregular / variable", "Strong, sometimes excessive", "Slow, heavy after meals", "Balanced"] },
  { id: "kostha", type: "choice", section: "ayush", technicalTerm: "Kostha", question: "How are your bowel movements, usually?", options: ["Dry / irregular", "Loose / frequent", "Regular and well-formed", "Varies a lot"] },
  { id: "nidana", type: "choice", section: "ayush", technicalTerm: "Nidana", question: "Is there anything that seems to trigger or worsen your discomfort?", options: ["Stress or irregular routine", "Certain foods", "Weather changes", "Physical exertion", "Nothing specific", "Other"] },
];

/** AHARA-VIHARA lifestyle section (PS26047 sections 6 & 15). */
export const LIFESTYLE_FLOW: InterviewField[] = [
  { id: "foodHabits", type: "choice", section: "lifestyle", technicalTerm: "Ahara", question: "What best describes your usual diet?", options: ["Light and irregular meals", "Spicy / oily food often", "Heavy, regular meals", "Balanced, varied diet"] },
  { id: "mealTiming", type: "choice", section: "lifestyle", question: "How regular are your meal times?", options: ["Very regular", "Somewhat regular", "Irregular / skip meals often"] },
  { id: "waterIntake", type: "choice", section: "lifestyle", question: "How much water do you drink in a day?", options: ["Less than 4 glasses", "4-8 glasses", "More than 8 glasses"] },
  { id: "sleepPattern", type: "choice", section: "lifestyle", question: "How would you describe your sleep?", options: ["Sound and sufficient", "Difficulty falling asleep", "Frequent waking", "Oversleeping / excessive sleep"] },
  { id: "physicalActivity", type: "choice", section: "lifestyle", technicalTerm: "Vihara", question: "How active are you, day to day?", options: ["Sedentary (little movement)", "Light activity", "Moderately active", "Very active"] },
  { id: "dailyRoutine", type: "choice", section: "lifestyle", question: "How regular is your daily routine?", options: ["Very structured", "Somewhat structured", "Irregular / unpredictable"] },
  { id: "yogaMeditation", type: "choice", section: "lifestyle", question: "Do you practice yoga, meditation, or breathing exercises?", options: ["Regularly", "Occasionally", "Never"] },
];

/** Relevant medical history + previous treatment (PS26047 section 5C). */
export const MEDICAL_HISTORY_FLOW: InterviewField[] = [
  { id: "pastConditions", type: "text", section: "medical_history", question: "Do you have any ongoing health conditions? (e.g. diabetes, blood pressure) You can say 'none'." },
  { id: "currentMedications", type: "text", section: "medical_history", question: "Are you currently taking any medicines? Please list them, or say 'none'." },
  { id: "allergies", type: "text", section: "medical_history", question: "Do you have any known allergies? You can say 'none'." },
  { id: "previousTreatment", type: "text", section: "medical_history", question: "Have you had any previous Ayurveda, Siddha, Unani, Homeopathy, or other treatment for this problem? You can say 'none'." },
];

/** The full sequence shown one question at a time in the kiosk. */
export function getFullFlow(): InterviewField[] {
  return [...HPI_FLOW, ...AYUSH_FLOW, ...LIFESTYLE_FLOW, ...MEDICAL_HISTORY_FLOW];
}

export function isFlowComplete(answers: Record<string, unknown>): boolean {
  return getFullFlow().every((f) => answers[f.id] !== undefined && answers[f.id] !== "");
}
