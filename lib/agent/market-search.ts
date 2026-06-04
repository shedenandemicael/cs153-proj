import type { ItemIdentification } from "@/lib/ai/identify-item";
import type { ItemNotes } from "@/types";

const VAGUE_QUERIES = new Set(["resale item", "item", "product", "clothing", "shoes", "accessories"]);

export function buildMarketSearchQueryFromNotes(notes: ItemNotes): string {
  return [notes.brand, notes.size, notes.freeformNotes].filter(Boolean).join(" ").trim();
}

export function needsVisionIdentification(notes: ItemNotes, imagePaths: string[]): boolean {
  if (imagePaths.length === 0) return false;

  const query = buildMarketSearchQueryFromNotes(notes);
  if (!query) return true;
  if (VAGUE_QUERIES.has(query.toLowerCase())) return true;
  if (!notes.brand && !notes.freeformNotes) return true;

  return false;
}

export function enrichNotesFromIdentification(
  notes: ItemNotes,
  identification: ItemIdentification
): ItemNotes {
  const modelNotes = [identification.model, identification.productType, identification.color]
    .filter(Boolean)
    .join(" ");

  return {
    ...notes,
    brand: notes.brand ?? identification.brand,
    size: notes.size ?? identification.size,
    condition: notes.condition ?? identification.condition,
    freeformNotes: notes.freeformNotes ?? (modelNotes || undefined),
  };
}

export function buildMarketSearchQuery(
  notes: ItemNotes,
  identification?: ItemIdentification | null
): string {
  let query: string;

  if (identification?.ebaySearchQuery?.trim()) {
    query = identification.ebaySearchQuery.trim();
  } else {
    const fromNotes = buildMarketSearchQueryFromNotes(notes);
    if (fromNotes && !VAGUE_QUERIES.has(fromNotes.toLowerCase())) {
      query = fromNotes;
    } else if (identification) {
      query =
        [identification.brand, identification.model, identification.productType]
          .filter(Boolean)
          .join(" ")
          .trim() || fromNotes;
    } else {
      query = fromNotes;
    }
  }

  if (notes.size?.trim()) {
    const size = notes.size.trim();
    if (!query.toLowerCase().includes(size.toLowerCase())) {
      query = `${query} ${size}`.trim();
    }
  }

  return query || "resale item";
}
