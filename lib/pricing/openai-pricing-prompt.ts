import type { ComparableStats } from "./types";
import type { DeterminePriceInput } from "./types";

export const OPENAI_PRICING_SYSTEM_PROMPT = `You are an expert eBay resale pricing analyst. Your only job is to recommend auction starting price and Buy It Now price.

Rules:
- Use comparable listing data as the primary anchor when available.
- Adjust for condition, visible wear, brand tier, and completeness (box, tags, accessories) from photos.
- Auction starting price should attract bids but not undervalue; Buy It Now is typically 15–35% above starting for used goods.
- If seller gave a minimum acceptable price, starting price must be >= that minimum.
- If purchase price is known, avoid recommending starting price below purchase unless condition is poor.
- Be conservative when comparables are sparse or photos are unclear.
- Output JSON only.`;

export function buildOpenAIPricingUserPrompt(
  input: DeterminePriceInput,
  stats: ComparableStats | null,
  hasImages: boolean
): string {
  const { notes, comparables } = input;
  const lines: string[] = [
    "Recommend eBay pricing as JSON.",
    "",
    "Seller notes:",
    `- Brand: ${notes.brand ?? "(unknown)"}`,
    `- Size: ${notes.size ?? "(unknown)"}`,
    `- Condition: ${notes.condition ?? "(unknown)"}`,
    `- Defects: ${notes.defects ?? "(none)"}`,
    `- Purchase price: ${notes.purchasePrice != null ? `$${notes.purchasePrice}` : "(unknown)"}`,
    `- Minimum acceptable: ${notes.minPrice != null ? `$${notes.minPrice}` : "(none)"}`,
    `- Notes: ${notes.freeformNotes ?? "(none)"}`,
    "",
  ];

  if (stats) {
    lines.push(
      "Comparable price statistics (USD):",
      `- Count: ${stats.count}`,
      `- Median: $${stats.median}`,
      `- Mean: $${stats.mean}`,
      `- 25th–75th percentile: $${stats.p25} – $${stats.p75}`,
      `- Range: $${stats.min} – $${stats.max}`,
      ""
    );
  }

  if (comparables.length > 0) {
    lines.push("Individual comparables:");
    comparables.slice(0, 12).forEach((c) => {
      lines.push(`- $${c.price.toFixed(2)} — ${c.title}${c.condition ? ` (${c.condition})` : ""}`);
    });
    lines.push("");
  } else {
    lines.push("No comparable listings were found.", "");
  }

  lines.push(
    hasImages
      ? "Photos attached: assess condition vs comparables before pricing."
      : "No photos available: rely on notes and comparables only; lower pricingConfidence.",
    "",
    "Return JSON:",
    `{`,
    `  "startingPrice": number,`,
    `  "buyItNowPrice": number,`,
    `  "pricingConfidence": number between 0 and 1,`,
    `  "rationale": "2-4 sentences explaining the recommendation"`,
    `}`
  );

  return lines.join("\n");
}
