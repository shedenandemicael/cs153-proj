import type { EbayHealthCheck } from "./health";

export type ComparableListingType = "active" | "sold" | "mock";

export type ComparableSource = "mock" | "ebay-browse" | "ebay-sold";

export interface ComparableSearchParams {
  query: string;
  categoryId?: string;
  limit?: number;
  /** Include active listings (Browse API). Default true */
  includeActive?: boolean;
  /** Include sold items (Marketplace Insights). Default true */
  includeSold?: boolean;
}

export interface EbayComparable {
  ebayItemId?: string;
  title: string;
  price: number;
  condition?: string;
  soldDate?: string;
  url?: string;
  listingType: ComparableListingType;
  source: ComparableSource;
}

export interface ComparableSearchResult {
  comparables: EbayComparable[];
  meta: {
    query: string;
    configured: boolean;
    researchEnv: string;
    activeCount: number;
    soldCount: number;
    mockCount: number;
    soldApiAvailable: boolean;
    activeApiAvailable: boolean;
    soldApiError?: string;
    activeApiError?: string;
    searchAttempts: string[];
    usedMockFallback: boolean;
  };
}

export interface CategorySuggestion {
  categoryId: string;
  categoryName: string;
  confidence?: number;
}

export interface EbayResearchStatus {
  configured: boolean;
  environment: string;
  researchEnv: string;
  marketplaceId: string;
  fetchActive: boolean;
  fetchSold: boolean;
  allowMockFallback: boolean;
  soldInsightsNote: string;
  health?: EbayHealthCheck;
}
