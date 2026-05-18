import { getEbayConfig } from "@/lib/utils/ebay-config";
import { fetchComparables } from "./fetch/comparables";
import { getCategorySuggestions } from "./fetch/taxonomy";
import type {
  CategorySuggestion,
  ComparableSearchParams,
  ComparableSearchResult,
  EbayResearchStatus,
} from "./types";

/**
 * Read-only eBay client for market research (comparables + categories).
 * No listing creation, OAuth user flows, or publish operations.
 */
export class EbayResearchClient {
  private config = getEbayConfig();

  get isConfigured(): boolean {
    return this.config.isConfigured;
  }

  get environment(): string {
    return this.config.env;
  }

  getStatus(): EbayResearchStatus {
    const fetchSold = (process.env.EBAY_FETCH_SOLD ?? "true").toLowerCase() !== "false";
    const fetchActive = (process.env.EBAY_FETCH_ACTIVE ?? "true").toLowerCase() !== "false";

    return {
      configured: this.config.isConfigured,
      environment: this.config.env,
      marketplaceId: "EBAY_US",
      fetchActive,
      fetchSold,
      soldInsightsNote:
        "Sold comps use Marketplace Insights API (limited release). If unavailable, only active Browse listings are returned.",
    };
  }

  /** Primary method: fetch sold + active comparables for pricing */
  fetchComparables(params: ComparableSearchParams): Promise<ComparableSearchResult> {
    return fetchComparables(params);
  }

  /** @deprecated Use fetchComparables — kept for existing call sites */
  async searchComparables(params: ComparableSearchParams) {
    const result = await fetchComparables(params);
    return result.comparables;
  }

  getCategorySuggestions(query: string): Promise<CategorySuggestion[]> {
    if (!this.config.isConfigured) {
      return import("./mock-data").then((m) => m.MOCK_CATEGORIES);
    }
    return getCategorySuggestions(query);
  }
}

let researchClient: EbayResearchClient | null = null;

export function getEbayResearchClient(): EbayResearchClient {
  if (!researchClient) {
    researchClient = new EbayResearchClient();
  }
  return researchClient;
}

/** @deprecated Alias — returns research (fetch-only) client */
export function getEbayClient(): EbayResearchClient {
  return getEbayResearchClient();
}
