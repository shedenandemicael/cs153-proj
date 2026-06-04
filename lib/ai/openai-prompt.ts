import type { ListingGenerationInput } from "@/types";

export const OPENAI_LISTING_SYSTEM_PROMPT = `You are an expert eBay resale listing assistant. Analyze the provided product photos and seller notes to draft an accurate listing.

Rules:
- Base descriptions on what you can see in the photos. Do not invent brand, model, or defects that are not visible or stated in notes.
- Use standard eBay condition terminology (e.g. New with tags, Used - Good, For parts or not working).
- Title must be 80 characters or fewer, keyword-rich, and honest.
- descriptionBullets: 4–8 concise bullet points for the listing body (buyer-facing, no markdown).
- itemSpecifics: key eBay item specifics as string key-value pairs (Brand, Size, Color, Material, etc. when known).
- If final prices are provided in the prompt, use those exact values for startingPrice and buyItNowPrice.
- Otherwise price using comparable sales when provided; respect seller minimum price if given.
- confidenceScore: 0–1 reflecting how certain you are from photos + notes.
- warnings: flag uncertainty, missing info, or compliance issues (e.g. unclear authenticity).
- questions: always return an empty array []. Missing size, brand, or condition is collected earlier in the agent flow — do not ask the seller in this step.
- Output valid JSON only, matching the schema exactly.`;

export function buildOpenAIUserPrompt(input: ListingGenerationInput, hasImages: boolean): string {
  const { notes, comparables, priceRecommendation } = input;
  const lines: string[] = [
    "Draft a complete eBay listing draft as JSON.",
    "",
    "Seller notes:",
    `- Brand: ${notes.brand ?? "(not provided)"}`,
    `- Size: ${notes.size ?? "(not provided)"}`,
    `- Condition (seller stated): ${notes.condition ?? "(not provided)"}`,
    `- Defects / wear: ${notes.defects ?? "(none noted)"}`,
    `- Purchase price: ${notes.purchasePrice != null ? `$${notes.purchasePrice}` : "(not provided)"}`,
    `- Minimum acceptable price: ${notes.minPrice != null ? `$${notes.minPrice}` : "(not provided)"}`,
    `- Additional notes: ${notes.freeformNotes ?? "(none)"}`,
    "",
  ];

  if (priceRecommendation) {
    lines.push(
      "Final prices (already determined — use exactly in your JSON):",
      `- startingPrice: ${priceRecommendation.startingPrice}`,
      `- buyItNowPrice: ${priceRecommendation.buyItNowPrice}`,
      `- Pricing rationale: ${priceRecommendation.rationale}`,
      ""
    );
  } else if (comparables.length > 0) {
    const avg = comparables.reduce((s, c) => s + c.price, 0) / comparables.length;
    lines.push("Comparable listings (for context):");
    comparables.forEach((c) => {
      lines.push(`- ${c.title}: $${c.price.toFixed(2)}${c.condition ? ` (${c.condition})` : ""}`);
    });
    lines.push(`Average comparable price: $${avg.toFixed(2)}`, "");
  }

  if (hasImages) {
    lines.push(
      "Product photos are attached. Identify the item, describe visible condition, color, and notable details from the images."
    );
  } else {
    lines.push(
      "No photos could be loaded — rely on seller notes only and lower confidenceScore."
    );
  }

  lines.push(
    "",
    "JSON schema:",
    `{`,
    `  "title": "string (max 80 chars)",`,
    `  "descriptionBullets": ["string"],`,
    `  "itemSpecifics": { "Key": "value" },`,
    `  "conditionDesc": "string",`,
    `  "categoryId": "string (eBay category ID if known, else best guess)",`,
    `  "categoryName": "string",`,
    `  "startingPrice": number,`,
    `  "buyItNowPrice": number | null,`,
    `  "shippingAssumptions": "string",`,
    `  "confidenceScore": number between 0 and 1,`,
    `  "warnings": ["string"],`,
    `  "questions": []`,
    `}`
  );

  return lines.join("\n");
}
