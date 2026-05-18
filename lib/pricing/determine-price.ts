import type { DeterminePriceInput, PriceRecommendation } from "./types";
import { computeComparableStats } from "./comparable-stats";
import { determinePriceWithOpenAI } from "./openai-pricing";
import { applyPriceFloors } from "./parse-price-response";
import { priceFromStats } from "./stats-pricing";

/**
 * Determine listing prices from comparables + vision (gpt-4o) or statistical fallback.
 */
export async function determinePrice(input: DeterminePriceInput): Promise<PriceRecommendation> {
  const stats = computeComparableStats(input.comparables);
  const useOpenAI =
    process.env.OPENAI_API_KEY?.trim() &&
    (process.env.PRICING_PROVIDER ?? "openai").toLowerCase() !== "stats";

  if (useOpenAI) {
    try {
      return await determinePriceWithOpenAI(input, stats);
    } catch (error) {
      console.error("[determinePrice] OpenAI pricing failed, using stats fallback:", error);
      const fallback = priceFromStats(stats, input.notes);
      fallback.rationale =
        `OpenAI pricing unavailable (${error instanceof Error ? error.message : "error"}). ` +
        fallback.rationale;
      fallback.pricingConfidence = Math.min(fallback.pricingConfidence, 0.4);
      return applyPriceFloors(fallback, input.notes.minPrice);
    }
  }

  return applyPriceFloors(priceFromStats(stats, input.notes), input.notes.minPrice);
}
