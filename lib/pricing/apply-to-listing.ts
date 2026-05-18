import type { GeneratedListing } from "@/types";
import type { PriceRecommendation } from "./types";

export function applyPriceToListing(
  listing: GeneratedListing,
  price: PriceRecommendation
): GeneratedListing {
  const pricingNote = `Pricing (${price.method}): ${price.rationale}`;
  const hasNote = listing.warnings.some((w) => w.startsWith("Pricing ("));

  return {
    ...listing,
    startingPrice: price.startingPrice,
    buyItNowPrice: price.buyItNowPrice,
    confidenceScore: Math.min(
      listing.confidenceScore,
      price.pricingConfidence * 0.4 + listing.confidenceScore * 0.6
    ),
    warnings: hasNote ? listing.warnings : [pricingNote, ...listing.warnings],
  };
}
