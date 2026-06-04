import type { AgentQuestion } from "@/lib/agent/types";

export function applyAnswersToItemUpdate(
  answers: Record<string, string>,
  questions: AgentQuestion[]
): {
  notesBrand?: string;
  notesSize?: string;
  notesCondition?: string;
  freeformNotes?: string;
} {
  const data: {
    notesBrand?: string;
    notesSize?: string;
    notesCondition?: string;
    freeformNotes?: string;
  } = {};

  for (const q of questions) {
    const value = answers[q.id]?.trim();
    if (!value) continue;

    switch (q.field) {
      case "brand":
        data.notesBrand = value;
        break;
      case "size":
        data.notesSize = value;
        break;
      case "condition":
        data.notesCondition = value;
        break;
      case "freeformNotes":
        data.freeformNotes = value;
        break;
      default:
        data.freeformNotes = [data.freeformNotes, value].filter(Boolean).join("; ");
        break;
    }
  }

  return data;
}
