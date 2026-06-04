import type { ItemNotes } from "@/types";

/** Topics collected via the pre-listing popup — never repeat in listing output. */
const PRE_FLIGHT_TOPIC = /\b(size|brand|condition|what is the size|what size|size of the)\b/i;

/**
 * Remove seller questions that belong in the agent popup or are already answered in notes.
 */
export function filterListingQuestions(questions: string[], notes: ItemNotes): string[] {
  return questions.filter((q) => {
    const lower = q.toLowerCase().trim();
    if (!lower) return false;

    if (notes.size?.trim() && /\bsize\b/.test(lower)) return false;
    if (notes.brand?.trim() && /\bbrand\b/.test(lower)) return false;
    if (notes.condition?.trim() && /\bcondition\b/.test(lower)) return false;

    // Size/brand/condition are asked in the popup before market research
    if (PRE_FLIGHT_TOPIC.test(lower)) return false;

    return true;
  });
}
