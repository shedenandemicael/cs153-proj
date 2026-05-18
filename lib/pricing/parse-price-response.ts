import type { PriceRecommendation } from "./types";
import type { ComparableStats, PricingMethod } from "./types";
import { roundPrice } from "./comparable-stats";

export function parseOpenAIPriceResponse(
  raw: unknown,
  stats: ComparableStats | null
): Omit<PriceRecommendation, "method" | "stats"> {
  if (!raw || typeof raw !== "object") {
    throw new Error("OpenAI pricing response was not a JSON object");
  }

  const data = raw as Record<string, unknown>;
  const startingPrice = roundPrice(parsePrice(data.startingPrice, "startingPrice"));
  let buyItNowPrice = roundPrice(parsePrice(data.buyItNowPrice, "buyItNowPrice"));
  const rationale = String(data.rationale ?? "").trim();

  if (buyItNowPrice <= startingPrice) {
    buyItNowPrice = roundPrice(startingPrice * 1.25);
  }

  let pricingConfidence = parseConfidence(data.pricingConfidence);

  if (!rationale) {
    throw new Error("OpenAI pricing response missing rationale");
  }

  return {
    startingPrice: Math.max(9.99, startingPrice),
    buyItNowPrice,
    pricingConfidence,
    rationale,
  };
}

function parsePrice(value: unknown, field: string): number {
  const n = typeof value === "number" ? value : parseFloat(String(value));
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`OpenAI pricing invalid ${field}`);
  }
  return n;
}

function parseConfidence(value: unknown): number {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? 0.6));
  if (!Number.isFinite(n)) return 0.6;
  return Math.min(1, Math.max(0, n));
}

export function applyPriceFloors(
  rec: PriceRecommendation,
  minPrice?: number
): PriceRecommendation {
  let { startingPrice, buyItNowPrice, rationale } = rec;

  if (minPrice != null && startingPrice < minPrice) {
    startingPrice = minPrice;
    rationale += ` Starting price raised to seller minimum $${minPrice.toFixed(2)}.`;
  }

  if (buyItNowPrice <= startingPrice) {
    buyItNowPrice = roundPrice(startingPrice * 1.25);
  }

  return { ...rec, startingPrice, buyItNowPrice, rationale };
}
