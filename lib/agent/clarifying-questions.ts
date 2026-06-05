import type { ItemIdentification } from "@/lib/ai/identify-item";
import type { AgentQuestion } from "@/lib/agent/types";
import type { ItemNotes } from "@/types";

const SIZE_RELEVANT =
  /\b(sneaker|sneakers|shoe|shoes|boot|boots|footwear|sandal|loafer|trainer|cleat|slipper|air max|jordan|dunk|yeezy)\b/i;

const APPAREL_SIZED =
  /\b(shirt|jacket|dress|pants|jeans|hoodie|sweater|coat|blazer|skirt|shorts|top|blouse|tee|t-?shirt|cardigan|vest|suit|legging|jogger|sweatshirt|pullover|parka|windbreaker|denim|apparel|clothing)\b/i;

const NON_SIZED =
  /\b(book|lamp|figure|figurine|toy|electronic|electronics|phone|tablet|monitor|display|screen|console|xbox|playstation|nintendo|switch|controller|gamepad|gaming|computer|laptop|pc|macbook|gpu|cpu|keyboard|mouse|camera|tv|television|speaker|headphone|earbuds|charger|cable|adapter|handheld|case|poster|card|coin|handkerchief|tenugui|gacha|strap|patch|pouch|soap dish|blocks|dell|hp|lenovo)\b/i;

function productHaystack(
  searchQuery: string,
  identification: ItemIdentification | null
): string {
  return [searchQuery, identification?.productType, identification?.ebaySearchQuery, identification?.model]
    .filter(Boolean)
    .join(" ");
}

function isNonSizedProduct(searchQuery: string, identification: ItemIdentification | null): boolean {
  return NON_SIZED.test(productHaystack(searchQuery, identification));
}

function isSizeRelevantProduct(searchQuery: string, identification: ItemIdentification | null): boolean {
  if (isNonSizedProduct(searchQuery, identification)) return false;
  const haystack = productHaystack(searchQuery, identification);
  return SIZE_RELEVANT.test(haystack) || APPAREL_SIZED.test(haystack);
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
  if (APPAREL_SIZED.test(haystack)) {
    return "What size is it? (e.g. Medium, Large, 32x34)";
  }
  return "What size is it?";
}

function sizeQuestionPlaceholder(searchQuery: string, identification: ItemIdentification | null): string {
  const haystack = productHaystack(searchQuery, identification).toLowerCase();
  if (SIZE_RELEVANT.test(haystack)) return "US men's 10";
  if (APPAREL_SIZED.test(haystack)) return "Medium";
  return "";
}

/** Questions the agent should ask before market research when photos/notes are incomplete. */
export function buildClarifyingQuestions(
  notes: ItemNotes,
  identification: ItemIdentification | null,
  searchQuery: string
): AgentQuestion[] {
  const questions: AgentQuestion[] = [];

  const needsSize =
    !hasSize(notes, identification) && isSizeRelevantProduct(searchQuery, identification);

  if (needsSize) {
    questions.push({
      id: "size",
      field: "size",
      question: sizeQuestionText(searchQuery, identification),
      placeholder: sizeQuestionPlaceholder(searchQuery, identification),
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

  if (
    !notes.condition?.trim() &&
    !identification?.condition?.trim() &&
    !isNonSizedProduct(searchQuery, identification)
  ) {
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
