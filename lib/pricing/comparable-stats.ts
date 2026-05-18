import type { ComparableListingSummary } from "@/types";
import type { ComparableStats } from "./types";

export function computeComparableStats(
  comparables: ComparableListingSummary[]
): ComparableStats | null {
  const prices = comparables
    .map((c) => c.price)
    .filter((p) => Number.isFinite(p) && p > 0)
    .sort((a, b) => a - b);

  if (prices.length === 0) return null;

  const sum = prices.reduce((a, b) => a + b, 0);
  const mean = sum / prices.length;
  const median = percentile(prices, 50);
  const p25 = percentile(prices, 25);
  const p75 = percentile(prices, 75);

  return {
    count: prices.length,
    mean: round(mean),
    median: round(median),
    min: round(prices[0]),
    max: round(prices[prices.length - 1]),
    p25: round(p25),
    p75: round(p75),
  };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 1) return sorted[0];
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

export function roundPrice(value: number): number {
  return Math.round(value * 100) / 100;
}

export function round(value: number): number {
  return roundPrice(value);
}
