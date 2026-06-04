import type { ItemIdentification } from "@/lib/ai/identify-item";
import type { AgentQuestion } from "@/lib/agent/types";
import type { ItemNotes } from "@/types";

const SIZE_RELEVANT =
  /\b(sneaker|shoe|boot|footwear|sandal|loafer|trainer|cleat|slipper|apparel|clothing|shirt|jacket|pants|jeans|dress|hoodie|coat|sweater|top|blouse|skirt|shorts)\b/i;

function textSignalsSize(query: string, identification: ItemIdentification | null): boolean {
  const haystack = [query, identification?.productType, identification?.ebaySearchQuery, identification?.model]
    .filter(Boolean)
    .join(" ");
  return SIZE_RELEVANT.test(haystack);
}

function hasSize(notes: ItemNotes, identification: ItemIdentification | null): boolean {
  return Boolean(notes.size?.trim() || identification?.size?.trim());
}

/** Questions the agent should ask before market research when photos/notes are incomplete. */
export function buildClarifyingQuestions(
  notes: ItemNotes,
  identification: ItemIdentification | null,
  searchQuery: string
): AgentQuestion[] {
  const questions: AgentQuestion[] = [];

  if (textSignalsSize(searchQuery, identification) && !hasSize(notes, identification)) {
    questions.push({
      id: "size",
      field: "size",
      question: "What is the size? (e.g. US men's 10, women's 8.5, Medium)",
      placeholder: "US men's 10",
      required: true,
    });
  }

  if (!notes.brand?.trim() && !identification?.brand?.trim()) {
    questions.push({
      id: "brand",
      field: "brand",
      question: "What brand is this item?",
      placeholder: "Nike",
      required: true,
    });
  }

  if (!notes.condition?.trim() && !identification?.condition?.trim()) {
    questions.push({
      id: "condition",
      field: "condition",
      question: "What condition is the item in?",
      placeholder: "New with box / Used - Good / etc.",
      required: false,
    });
  }

  return questions;
}
