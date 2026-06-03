import { getMockComparables } from "../mock-data";
import type { ComparableSearchParams, ComparableSearchResult, EbayComparable } from "../types";
import { getEbayResearchConfig } from "@/lib/utils/ebay-config";
import { isEbayConfigured } from "./http";
import { searchActiveListingsWithFallbacks } from "./browse";
import { searchSoldListings } from "./marketplace-insights";
import { resolveCategoryId } from "./taxonomy";
import { buildSearchQueryVariants } from "./query-helpers";

function dedupeComparables(items: EbayComparable[]): EbayComparable[] {
  const seen = new Set<string>();
  const out: EbayComparable[] = [];
  for (const item of items) {
    const key = item.ebayItemId ?? `${item.title}:${item.price}:${item.listingType}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/**
 * Fetch comparable listings for pricing research (read-only).
 * Uses production Browse by default for real inventory; merges sold data when Insights is enabled.
 */
export async function fetchComparables(
  params: ComparableSearchParams
): Promise<ComparableSearchResult> {
  const config = getEbayResearchConfig();
  const query = params.query.trim() || "resale item";
  const limit = Math.min(params.limit ?? 12, 24);
  const includeActive = params.includeActive ?? config.fetchActive;
  const includeSold = params.includeSold ?? config.fetchSold;
  const queryVariants = buildSearchQueryVariants(query);

  if (!isEbayConfigured()) {
    const mocks = getMockComparables(query);
    return {
      comparables: mocks,
      meta: {
        query,
        configured: false,
        researchEnv: config.researchEnv,
        activeCount: 0,
        soldCount: 0,
        mockCount: mocks.length,
        soldApiAvailable: false,
        activeApiAvailable: false,
        soldApiError: "eBay credentials not configured",
        activeApiError: "eBay credentials not configured",
        searchAttempts: [],
        usedMockFallback: true,
      },
    };
  }

  let soldApiAvailable = false;
  let soldApiError: string | undefined;
  let activeApiAvailable = false;
  let activeApiError: string | undefined;
  const searchAttempts: string[] = [];
  const sold: EbayComparable[] = [];
  const active: EbayComparable[] = [];

  const categoryId = await resolveCategoryId(query, params.categoryId);

  const soldLimit = includeSold ? Math.ceil(limit / 2) : 0;
  const activeLimit = includeActive ? Math.max(limit - soldLimit, limit) : 0;

  if (includeSold && soldLimit > 0) {
    const soldOutcome = await searchSoldListings(query, {
      limit: soldLimit,
      categoryId,
    });
    soldApiAvailable = soldOutcome.available;
    soldApiError = soldOutcome.error;
    sold.push(...soldOutcome.items);
    if (soldOutcome.attempt) searchAttempts.push(`sold: ${soldOutcome.attempt.query}`);
  }

  if (includeActive && activeLimit > 0) {
    const activeOutcome = await searchActiveListingsWithFallbacks(queryVariants, {
      limit: activeLimit,
      categoryId: params.categoryId ?? categoryId,
      fixedPriceOnly: true,
      usedOnly: false,
    });
    activeApiAvailable = activeOutcome.items.length > 0;
    activeApiError = activeOutcome.error;
    active.push(...activeOutcome.items);
    searchAttempts.push(...activeOutcome.attempts);
  }

  let comparables = dedupeComparables([...sold, ...active]);

  if (comparables.length === 0) {
    if (!config.allowMockFallback) {
      return {
        comparables: [],
        meta: {
          query,
          configured: true,
          researchEnv: config.researchEnv,
          activeCount: 0,
          soldCount: 0,
          mockCount: 0,
          soldApiAvailable,
          activeApiAvailable: false,
          soldApiError,
          activeApiError:
            activeApiError ??
            soldApiError ??
            "No results from eBay APIs (mock fallback disabled)",
          searchAttempts,
          usedMockFallback: false,
        },
      };
    }

    const mocks = getMockComparables(query);
    return {
      comparables: mocks,
      meta: {
        query,
        configured: true,
        researchEnv: config.researchEnv,
        activeCount: 0,
        soldCount: 0,
        mockCount: mocks.length,
        soldApiAvailable,
        activeApiAvailable: false,
        soldApiError,
        activeApiError: activeApiError ?? "No results from eBay; using mock comparables",
        searchAttempts,
        usedMockFallback: true,
      },
    };
  }

  comparables = comparables.slice(0, limit);

  return {
    comparables,
    meta: {
      query,
      configured: true,
      researchEnv: config.researchEnv,
      activeCount: active.length,
      soldCount: sold.length,
      mockCount: 0,
      soldApiAvailable,
      activeApiAvailable: activeApiAvailable || active.length > 0,
      soldApiError,
      activeApiError,
      searchAttempts,
      usedMockFallback: false,
    },
  };
}
