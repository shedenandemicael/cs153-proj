export type ItemStatus =
  | "PROCESSING"
  | "AWAITING_INPUT"
  | "READY"
  | "PUBLISHED"
  | "FAILED"
  | "INTAKE"
  | "GENERATED"
  | "REVIEWED";
export type DraftStatus = "DRAFT" | "APPROVED" | "REJECTED";

export interface ItemNotes {
  brand?: string;
  size?: string;
  condition?: string;
  defects?: string;
  purchasePrice?: number;
  minPrice?: number;
  freeformNotes?: string;
}

export interface PriceRecommendationInput {
  startingPrice: number;
  buyItNowPrice: number;
  pricingConfidence: number;
  rationale: string;
  method: string;
}

export interface ListingGenerationInput {
  itemId: string;
  notes: ItemNotes;
  imagePaths: string[];
  comparables: ComparableListingSummary[];
  /** When set, listing copy generation should not override these prices */
  priceRecommendation?: PriceRecommendationInput;
}

export interface ComparableListingSummary {
  title: string;
  price: number;
  condition?: string;
  soldDate?: string;
  url?: string;
}

export interface GeneratedListing {
  title: string;
  descriptionBullets: string[];
  itemSpecifics: Record<string, string>;
  conditionDesc: string;
  categoryId?: string;
  categoryName?: string;
  startingPrice: number;
  buyItNowPrice?: number;
  shippingAssumptions: string;
  confidenceScore: number;
  warnings: string[];
  questions: string[];
}

export interface ListingDraftFormData {
  title: string;
  descriptionBullets: string[];
  itemSpecifics: Record<string, string>;
  conditionDesc: string;
  categoryId?: string;
  categoryName?: string;
  startingPrice: number;
  buyItNowPrice?: number;
  shippingAssumptions?: string;
}

export interface EvaluationRubric {
  titleClarity: number;
  descriptionCompleteness: number;
  pricingReasonableness: number;
  categoryAccuracy: number;
  overall: number;
}

export const TRACKED_GENERATED_FIELDS = [
  "title",
  "descriptionBullets",
  "itemSpecifics",
  "conditionDesc",
  "categoryName",
  "startingPrice",
  "buyItNowPrice",
  "shippingAssumptions",
] as const;
