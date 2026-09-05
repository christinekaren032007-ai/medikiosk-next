import { ComplaintCategory, InterviewAnswers } from "@/types/clinical";
import { RedFlag } from "@/types/ai";

/**
 * Evaluates intake answers for possible-emergency patterns.
 * This NEVER diagnoses — it only flags a pattern for staff attention.
 */
export function evaluateRedFlag(category: ComplaintCategory, answers: InterviewAnswers): RedFlag {
  if (category === "chest_pain") {
    const associated = (answers.associated as string[] | undefined) || [];
    const severity = Number(answers.severity ?? 0);
    const shortnessOfBreath = associated.includes("Shortness of breath");
    if (shortnessOfBreath && severity >= 7) {
      return {
        triggered: true,
        reason: "Chest pain with breathlessness and high self-reported severity was reported during intake.",
      };
    }
  }
  if (category === "breathlessness") {
    const severity = Number(answers.severity ?? 0);
    if (severity >= 7) {
      return {
        triggered: true,
        reason: "Severe breathlessness was reported during intake.",
      };
    }
  }
  return { triggered: false, reason: null };
}
