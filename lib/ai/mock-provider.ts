import type { GeneratedListing, ListingGenerationInput } from "@/types";
import { applyPriceToListing } from "@/lib/pricing/apply-to-listing";
import type { PriceRecommendation } from "@/lib/pricing/types";
import type { LLMProvider } from "./types";

/**
 * Mock LLM provider for local development without API keys.
 * Replace with real vision + text calls when wiring OpenAI or Workers AI.
 */
export class MockLLMProvider implements LLMProvider {
  readonly name = "mock";

  async generateListing(input: ListingGenerationInput): Promise<GeneratedListing> {
    await delay(800);

    const { notes, comparables } = input;
    const brand = notes.brand?.trim() || "Unbranded";
    const size = notes.size?.trim();
    const condition = notes.condition?.trim() || "Used - Good";
    const defects = notes.defects?.trim();

    const priceRecommendation = toPriceRecommendation(input);

    const titleParts = [brand, size, "Item"].filter(Boolean);
    const title = `${titleParts.join(" ")} — ${condition.split(" ")[0]} Condition`.slice(0, 80);

    const bullets = [
      `${brand} item in ${condition.toLowerCase()} condition.`,
      size ? `Size: ${size}.` : "Please see photos for measurements.",
      defects
        ? `Notable wear: ${defects}.`
        : "Light normal wear consistent with pre-owned use.",
      "Ships within 1 business day via USPS with tracking.",
      "Photos show actual item you will receive.",
    ];

    const warnings: string[] = [];
    const questions: string[] = [];

    if (!notes.brand) {
      warnings.push("Brand was not provided — title may need manual verification.");
      questions.push("Can you confirm the brand from tags or labels?");
    }
    if (!notes.condition) {
      warnings.push("Condition was inferred; please verify against photos.");
    }
    if (comparables.length === 0) {
      warnings.push("No comparable listings found — pricing is a rough estimate.");
    }
    if (defects) {
      warnings.push("Defects noted — ensure photos clearly show damage.");
    }

    const listing: GeneratedListing = {
      title,
      descriptionBullets: bullets,
      itemSpecifics: {
        Brand: brand,
        ...(size ? { Size: size } : {}),
        Condition: condition,
        Type: "General",
      },
      conditionDesc: `${condition}. ${defects ? `Seller notes: ${defects}` : "See photos for details."}`,
      categoryId: "11450",
      categoryName: "Clothing, Shoes & Accessories",
      startingPrice: priceRecommendation.startingPrice,
      buyItNowPrice: priceRecommendation.buyItNowPrice,
      shippingAssumptions: "USPS Ground Advantage, 1 lb, buyer pays calculated shipping",
      confidenceScore: comparables.length >= 3 ? 0.82 : comparables.length >= 1 ? 0.68 : 0.52,
      warnings,
      questions,
    };

    return applyPriceToListing(listing, priceRecommendation);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toPriceRecommendation(input: ListingGenerationInput): PriceRecommendation {
  const p = input.priceRecommendation;
  if (p) {
    return {
      startingPrice: p.startingPrice,
      buyItNowPrice: p.buyItNowPrice,
      pricingConfidence: p.pricingConfidence,
      rationale: p.rationale,
      method: p.method as PriceRecommendation["method"],
      stats: null,
    };
  }
  const avg =
    input.comparables.length > 0
      ? input.comparables.reduce((s, c) => s + c.price, 0) / input.comparables.length
      : 45;
  const starting = Math.max(9.99, input.notes.minPrice ?? avg * 0.92);
  return {
    startingPrice: starting,
    buyItNowPrice: Math.round(starting * 1.32 * 100) / 100,
    pricingConfidence: 0.4,
    rationale: "Quick estimate (pricing service not run).",
    method: "fallback",
    stats: null,
  };
}
