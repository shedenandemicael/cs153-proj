import type { ComparableListingSummary, ItemNotes } from "@/types";

export interface ComparableStats {
  count: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  p25: number;
  p75: number;
}

export type PricingMethod = "openai-vision" | "comparable-stats" | "fallback";

export interface PriceRecommendation {
  startingPrice: number;
  buyItNowPrice: number;
  /** 0–1 confidence for pricing specifically */
  pricingConfidence: number;
  rationale: string;
  method: PricingMethod;
  stats: ComparableStats | null;
}

export interface DeterminePriceInput {
  notes: ItemNotes;
  imagePaths: string[];
  comparables: ComparableListingSummary[];
}
