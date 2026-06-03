import { getEbayResearchConfig } from "@/lib/utils/ebay-config";
import { checkEbayResearchHealth } from "./health";
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
  private config = getEbayResearchConfig();

  get isConfigured(): boolean {
    return this.config.isConfigured;
  }

  get environment(): string {
    return this.config.env;
  }

  get researchEnvironment(): string {
    return this.config.researchEnv;
  }

  async getStatus(options: { health?: boolean } = {}): Promise<EbayResearchStatus> {
    const status: EbayResearchStatus = {
      configured: this.config.isConfigured,
      environment: this.config.env,
      researchEnv: this.config.researchEnv,
      marketplaceId: "EBAY_US",
      fetchActive: this.config.fetchActive,
      fetchSold: this.config.fetchSold,
      allowMockFallback: this.config.allowMockFallback,
      soldInsightsNote:
        "Sold comps use Marketplace Insights (limited release). Active comps use Browse API on the research environment (production by default).",
    };

    if (options.health) {
      status.health = await checkEbayResearchHealth();
    }

    return status;
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
