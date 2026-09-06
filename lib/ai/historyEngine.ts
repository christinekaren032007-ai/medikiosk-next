import { ComplaintCategory, InterviewField } from "@/types/clinical";

export const CHIEF_COMPLAINTS: { key: ComplaintCategory; label: string }[] = [
  { key: "chest_pain", label: "Chest pain" },
  { key: "fever", label: "Fever" },
  { key: "cough", label: "Cough" },
  { key: "headache", label: "Headache" },
  { key: "abdominal_pain", label: "Abdominal pain" },
  { key: "nausea_vomiting", label: "Nausea / Vomiting" },
  { key: "breathlessness", label: "Breathing difficulty" },
  { key: "injury_pain", label: "Injury / Pain" },
  { key: "diarrhea", label: "Diarrhea" },
  { key: "skin_problem", label: "Skin problem" },
  { key: "diabetes", label: "Follow-up / fatigue" },
  { key: "ayush", label: "General wellness (Ayurveda)" },
  { key: "other", label: "Other" },
];

/**
 * Categories without a bespoke question tree below use this minimal flow —
 * the rest of the conversation is carried by Gemini's adaptive follow-up
 * questions (lib/ai/gemini.ts), which already tailor themselves to
 * whatever chief complaint and answers they're given.
 */
const GENERIC_FLOW: InterviewField[] = [
  { id: "description", type: "text", question: "Please briefly describe what's bothering you, in your own words." },
  { id: "onset", type: "choice", question: "When did this start?", options: ["Today", "Yesterday", "2-3 days ago", "More than a week ago"] },
  { id: "severity", type: "slider", question: "How severe would you say this is, from 0 to 10?" },
];

/**
 * FLOWS: a deterministic question tree per complaint category.
 * historyEngine.getFlow() is the single place UI components should read
 * from — never hard-code question screens in components.
 */
export const FLOWS: Partial<Record<ComplaintCategory, InterviewField[]>> = {
  chest_pain: [
    { id: "onset", type: "choice", question: "When did the pain start?", options: ["Today", "Yesterday", "More than a week ago", "I don't know"] },
    { id: "location", type: "choice", question: "Where do you feel the pain?", options: ["Center of chest", "Left side", "Right side", "Upper chest", "Other"] },
    { id: "character", type: "choice", question: "What does the pain feel like?", options: ["Pressure", "Burning", "Sharp", "Tightness", "Other"] },
    { id: "radiation", type: "choice", question: "Does the pain move anywhere?", options: ["Left arm", "Right arm", "Jaw", "Back", "No"] },
    { id: "severity", type: "slider", question: "How severe is the pain, from 0 to 10?" },
    { id: "associated", type: "multi", question: "Do you have any of these symptoms?", options: ["Shortness of breath", "Sweating", "Nausea", "Dizziness", "None"] },
  ],
  fever: [
    { id: "onset", type: "choice", question: "How long have you had the fever?", options: ["Since today", "2-3 days", "More than a week"] },
    { id: "intensity", type: "choice", question: "How high does the fever feel?", options: ["Mild", "High", "Very high", "Not measured"] },
    { id: "associated", type: "multi", question: "Any of these along with the fever?", options: ["Chills", "Body ache", "Cough", "Rash", "None"] },
    { id: "severity", type: "slider", question: "Overall, how unwell do you feel, 0 to 10?" },
  ],
  diabetes: [
    { id: "reason", type: "choice", question: "What brings you in today?", options: ["Routine follow-up", "Feeling more tired than usual", "Medicine review", "Other"] },
    { id: "adherence", type: "choice", question: "Have you been taking your medicines regularly?", options: ["Yes, every day", "Sometimes miss a dose", "Stopped taking them", "Not on medication"] },
    { id: "diet", type: "choice", question: "How has your diet been lately?", options: ["Controlled", "Some lapses", "Not controlled"] },
    { id: "severity", type: "slider", question: "How would you rate your energy levels, 0 to 10?" },
  ],
  abdominal_pain: [
    { id: "onset", type: "choice", question: "When did the pain start?", options: ["Today", "Yesterday", "2-3 days ago", "More than a week ago"] },
    { id: "location", type: "choice", question: "Where is the pain?", options: ["Upper abdomen", "Lower abdomen", "Around the navel", "Generalized"] },
    { id: "character", type: "choice", question: "What does the pain feel like?", options: ["Cramping", "Burning", "Dull ache", "Sharp"] },
    { id: "severity", type: "slider", question: "How severe is the pain, from 0 to 10?" },
    { id: "associated", type: "multi", question: "Any of these along with the pain?", options: ["Nausea", "Vomiting", "Fever", "Loose stools", "None"] },
  ],
  breathlessness: [
    { id: "onset", type: "choice", question: "When did the breathlessness start?", options: ["Today", "Yesterday", "2-3 days ago", "Gradually over weeks"] },
    { id: "trigger", type: "choice", question: "When is it most noticeable?", options: ["At rest", "On exertion / walking", "Lying flat", "All the time"] },
    { id: "severity", type: "slider", question: "How severe is the breathlessness, from 0 to 10?" },
    { id: "associated", type: "multi", question: "Any of these along with it?", options: ["Chest pain", "Cough", "Swelling in legs", "Palpitations", "None"] },
  ],
  // AYUSH: all 15 Trividha/Dashavidha Pariksha parameters, rephrased for patients.
  ayush: [
    { id: "prakriti", type: "choice", question: "How would you describe your usual body constitution?", options: ["Light, quick-moving, easily cold (Vata type)", "Warm, sharp appetite, medium build (Pitta type)", "Steady, calm, solid build (Kapha type)", "Not sure"] },
    { id: "vikriti", type: "choice", question: "How is your body feeling different from your usual self lately?", options: ["More restless / anxious than usual", "More irritable / overheated than usual", "More sluggish / heavy than usual", "No change"] },
    { id: "agni", type: "choice", question: "How is your digestion, generally?", options: ["Irregular / variable", "Strong, sometimes excessive", "Slow, heavy after meals", "Balanced"] },
    { id: "koshtha", type: "choice", question: "How would you describe your bowel movements?", options: ["Dry, irregular", "Loose, frequent", "Regular, well-formed", "Not sure"] },
    { id: "ahara", type: "choice", question: "What best describes your usual diet?", options: ["Light and irregular meals", "Spicy / oily food often", "Heavy, regular meals", "Balanced, varied diet"] },
    { id: "vihara", type: "choice", question: "How would you describe your daily activity and sleep?", options: ["Active but irregular sleep", "Moderate activity, sound sleep", "Sedentary, long sleep", "Varies a lot"] },
    { id: "nidana", type: "choice", question: "Is there anything that seems to trigger your discomfort?", options: ["Stress or irregular routine", "Certain foods", "Weather changes", "Nothing specific"] },
    { id: "sara", type: "choice", question: "How would you describe your overall tissue strength and vitality?", options: ["Feel delicate / low stamina", "Feel average", "Feel strong and robust"] },
    { id: "samhanana", type: "choice", question: "How would you describe your body's build and compactness?", options: ["Slender, loosely built", "Medium, proportionate", "Sturdy, well-knit"] },
    { id: "pramana", type: "choice", question: "How would you rate your general physical measurements (height/build) for your age?", options: ["Below average", "Average", "Above average"] },
    { id: "satmya", type: "choice", question: "Which kinds of food, climate, or lifestyle suit you best?", options: ["Warm, moist environments", "Cool, dry environments", "Moderate, any climate"] },
    { id: "sattva", type: "choice", question: "How would you describe your mental resilience under stress?", options: ["Easily disturbed", "Balanced, manageable", "Very calm and steady"] },
    { id: "aharaShakti", type: "choice", question: "How strong is your appetite, generally?", options: ["Weak / variable appetite", "Moderate appetite", "Strong appetite"] },
    { id: "vyayamaShakti", type: "choice", question: "How much physical activity can you comfortably do?", options: ["Tire quickly", "Moderate capacity", "High stamina"] },
    { id: "vaya", type: "choice", question: "Which life stage would you place yourself in, health-wise?", options: ["Growth stage (younger)", "Middle / stable stage", "Elder stage"] },
  ],
};

export function getFlow(category: ComplaintCategory): InterviewField[] {
  return FLOWS[category] || GENERIC_FLOW;
}

export function isFlowComplete(category: ComplaintCategory, answers: Record<string, unknown>): boolean {
  return getFlow(category).every((f) => answers[f.id] !== undefined && answers[f.id] !== "");
}
