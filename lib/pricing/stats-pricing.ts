import type { ItemNotes } from "@/types";
import type { ComparableStats, PriceRecommendation } from "./types";
import { roundPrice } from "./comparable-stats";

/** Rule-based pricing from comparable statistics when OpenAI is unavailable. */
export function priceFromStats(
  stats: ComparableStats | null,
  notes: ItemNotes
): PriceRecommendation {
  let anchor: number;
  let rationale: string;

  if (stats && stats.count > 0) {
    // Auction start slightly below median; BIN near upper quartile
    anchor = stats.median;
    rationale = `Based on ${stats.count} comparable(s): median $${stats.median.toFixed(2)}, range $${stats.min.toFixed(2)}–$${stats.max.toFixed(2)}.`;
  } else if (notes.purchasePrice != null && notes.purchasePrice > 0) {
    anchor = notes.purchasePrice * 1.4;
    rationale = `No comparables; anchored at ~40% above your purchase price ($${notes.purchasePrice.toFixed(2)}).`;
  } else {
    anchor = 45;
    rationale = "No comparables or purchase price; using conservative default anchor.";
  }

  let startingPrice = roundPrice(anchor * 0.92);
  const buyItNowPrice = roundPrice(
    stats ? Math.max(stats.p75, startingPrice * 1.28) : startingPrice * 1.35
  );

  if (notes.minPrice != null) {
    if (startingPrice < notes.minPrice) {
      startingPrice = notes.minPrice;
      rationale += ` Starting price set to your minimum $${notes.minPrice.toFixed(2)}.`;
    }
  }

  startingPrice = Math.max(9.99, startingPrice);

  return {
    startingPrice,
    buyItNowPrice: Math.max(buyItNowPrice, startingPrice + 1),
    pricingConfidence: stats ? Math.min(0.75, 0.45 + stats.count * 0.05) : 0.35,
    rationale,
    method: stats ? "comparable-stats" : "fallback",
    stats,
  };
}
