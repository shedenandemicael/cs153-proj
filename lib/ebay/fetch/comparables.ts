import { getMockComparables } from "../mock-data";
import type { ComparableSearchParams, ComparableSearchResult, EbayComparable } from "../types";
import { isEbayConfigured } from "./http";
import { searchActiveListings } from "./browse";
import { searchSoldListings } from "./marketplace-insights";
import { resolveCategoryId } from "./taxonomy";

function envFlag(name: string, defaultValue: boolean): boolean {
  const v = process.env[name];
  if (v === undefined) return defaultValue;
  return v.toLowerCase() === "true" || v === "1";
}

/**
 * Fetch comparable listings for pricing research (read-only).
 * Merges sold (Insights) + active (Browse), falls back to mocks.
 */
export async function fetchComparables(
  params: ComparableSearchParams
): Promise<ComparableSearchResult> {
  const query = params.query.trim() || "resale item";
  const limit = Math.min(params.limit ?? 12, 24);
  const includeActive = params.includeActive ?? envFlag("EBAY_FETCH_ACTIVE", true);
  const includeSold = params.includeSold ?? envFlag("EBAY_FETCH_SOLD", true);

  if (!isEbayConfigured()) {
    const mocks = getMockComparables(query);
    return {
      comparables: mocks,
      meta: {
        query,
        configured: false,
        activeCount: 0,
        soldCount: 0,
        mockCount: mocks.length,
        soldApiAvailable: false,
        soldApiError: "eBay credentials not configured",
      },
    };
  }

  let soldApiAvailable = false;
  let soldApiError: string | undefined;
  const sold: EbayComparable[] = [];
  const active: EbayComparable[] = [];

  const categoryId = await resolveCategoryId(query, params.categoryId);

  const soldLimit = Math.ceil(limit / 2);
  const activeLimit = limit - soldLimit;

  if (includeSold) {
    const soldOutcome = await searchSoldListings(query, {
      limit: soldLimit,
      categoryId,
    });
    soldApiAvailable = soldOutcome.available;
    soldApiError = soldOutcome.error;
    sold.push(...soldOutcome.items);
  }

  if (includeActive) {
    try {
      const activeItems = await searchActiveListings(query, {
        limit: activeLimit > 0 ? activeLimit : limit,
        categoryId: params.categoryId ?? categoryId,
      });
      active.push(...activeItems);
    } catch (error) {
      console.error("[fetchComparables] Browse search failed:", error);
    }
  }

  let comparables = [...sold, ...active];

  if (comparables.length === 0) {
    const mocks = getMockComparables(query);
    return {
      comparables: mocks,
      meta: {
        query,
        configured: true,
        activeCount: 0,
        soldCount: 0,
        mockCount: mocks.length,
        soldApiAvailable,
        soldApiError: soldApiError ?? "No results from eBay; using mock comparables",
      },
    };
  }

  comparables = comparables.slice(0, limit);

  return {
    comparables,
    meta: {
      query,
      configured: true,
      activeCount: active.length,
      soldCount: sold.length,
      mockCount: 0,
      soldApiAvailable,
      soldApiError,
    },
  };
}
