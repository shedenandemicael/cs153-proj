import type { ItemIdentification } from "@/lib/ai/identify-item";
import type { AgentQuestion } from "@/lib/agent/types";
import type { ItemNotes } from "@/types";

const SIZE_RELEVANT =
  /\b(sneaker|sneakers|shoe|shoes|boot|boots|footwear|sandal|loafer|trainer|cleat|slipper|air max|jordan|dunk|yeezy)\b/i;

const NON_SIZED =
  /\b(book|lamp|figure|figurine|toy|electronics|phone|tablet|case|poster|card|coin|handkerchief|tenugui|gacha|strap|patch|pouch|soap dish|blocks)\b/i;

function productHaystack(
  searchQuery: string,
  identification: ItemIdentification | null
): string {
  return [searchQuery, identification?.productType, identification?.ebaySearchQuery, identification?.model]
    .filter(Boolean)
    .join(" ");
}

function textSignalsSize(searchQuery: string, identification: ItemIdentification | null): boolean {
  return SIZE_RELEVANT.test(productHaystack(searchQuery, identification));
}

function isNonSizedProduct(searchQuery: string, identification: ItemIdentification | null): boolean {
  return NON_SIZED.test(productHaystack(searchQuery, identification));
}

function hasSize(notes: ItemNotes, identification: ItemIdentification | null): boolean {
  return Boolean(notes.size?.trim() || identification?.size?.trim());
}

function sizeQuestionText(searchQuery: string, identification: ItemIdentification | null): string {
  const haystack = productHaystack(searchQuery, identification).toLowerCase();
  if (/\bsneaker/.test(haystack)) {
    return "What is the size of the sneakers?";
  }
  if (/\b(shoe|boot|footwear)\b/.test(haystack)) {
    return "What is the shoe size? (e.g. US men's 10, women's 8.5)";
  }
  return "What is the size? (e.g. US men's 10, women's 8.5, Medium)";
}

/** Questions the agent should ask before market research when photos/notes are incomplete. */
export function buildClarifyingQuestions(
  notes: ItemNotes,
  identification: ItemIdentification | null,
  searchQuery: string,
  options?: { hasImages?: boolean }
): AgentQuestion[] {
  const questions: AgentQuestion[] = [];
  const hasImages = options?.hasImages ?? false;

  const needsSize =
    !hasSize(notes, identification) &&
    !isNonSizedProduct(searchQuery, identification) &&
    (hasImages || textSignalsSize(searchQuery, identification) || Boolean(identification?.brand));

  if (needsSize) {
    questions.push({
      id: "size",
      field: "size",
      question: sizeQuestionText(searchQuery, identification),
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
