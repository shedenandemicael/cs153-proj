import type { EbayComparable } from "../types";
import { assertEbaySuccess, ebayFetch } from "./http";
import { describeSearchAttempt, type SearchAttemptMeta } from "./query-helpers";

interface BrowseSearchResponse {
  itemSummaries?: Array<{
    itemId?: string;
    title?: string;
    price?: { value?: string; currency?: string };
    condition?: string;
    conditionId?: string;
    itemWebUrl?: string;
    buyingOptions?: string[];
  }>;
  total?: number;
  errors?: Array<{ message?: string; errorId?: number }>;
}

export interface ActiveSearchOptions {
  limit?: number;
  categoryId?: string;
  /** Restrict to fixed-price listings (common for resale comps). */
  fixedPriceOnly?: boolean;
  /** Restrict to used condition when possible. */
  usedOnly?: boolean;
}

export interface ActiveSearchOutcome {
  items: EbayComparable[];
  total?: number;
  error?: string;
  attempt?: SearchAttemptMeta;
}

function mapBrowseItems(data: BrowseSearchResponse): EbayComparable[] {
  const comparables: EbayComparable[] = [];
  for (const item of data.itemSummaries ?? []) {
    const price = parseFloat(item.price?.value ?? "0");
    if (!Number.isFinite(price) || price <= 0) continue;
    comparables.push({
      ebayItemId: item.itemId,
      title: item.title ?? "eBay listing",
      price,
      condition: item.condition,
      url: item.itemWebUrl,
      listingType: "active",
      source: "ebay-browse",
    });
  }
  return comparables;
}

/**
 * Active (live) listings — eBay Browse API
 * https://developer.ebay.com/api-docs/buy/browse/resources/item_summary/methods/search
 */
export async function searchActiveListings(
  query: string,
  options: ActiveSearchOptions = {}
): Promise<ActiveSearchOutcome> {
  const limit = Math.min(options.limit ?? 10, 50);
  const attempt: SearchAttemptMeta = {
    query,
    categoryId: options.categoryId,
    strategy: "browse",
  };

  const queryParams: Record<string, string | number | undefined> = {
    q: query.slice(0, 100),
    limit,
  };

  if (options.categoryId) {
    queryParams.category_ids = options.categoryId;
  }

  const filters: string[] = [];
  if (options.fixedPriceOnly ?? true) {
    filters.push("buyingOptions:{FIXED_PRICE}");
  }
  if (options.usedOnly) {
    filters.push("conditionIds:{3000|4000|5000|6000}");
  }
  if (filters.length > 0) {
    queryParams.filter = filters.join(",");
  }

  try {
    const { data, status } = await ebayFetch<BrowseSearchResponse>(
      "/buy/browse/v1/item_summary/search",
      queryParams
    );

    if (status < 200 || status >= 300) {
      return {
        items: [],
        error: data.errors?.[0]?.message ?? `Browse API error (${status})`,
        attempt,
      };
    }

    return {
      items: mapBrowseItems(data),
      total: data.total,
      attempt,
    };
  } catch (error) {
    return {
      items: [],
      error: error instanceof Error ? error.message : "Browse search failed",
      attempt,
    };
  }
}

/**
 * Try multiple query/category combinations until we get active listings.
 */
export async function searchActiveListingsWithFallbacks(
  queryVariants: string[],
  options: Omit<ActiveSearchOptions, "limit"> & { limit: number; categoryId?: string }
): Promise<ActiveSearchOutcome & { attempts: string[] }> {
  const attempts: string[] = [];
  const strategies: Array<{ query: string; categoryId?: string; strategy: string; usedOnly?: boolean }> =
    [];

  for (const variant of queryVariants) {
    strategies.push({
      query: variant,
      categoryId: options.categoryId,
      strategy: "browse+category",
    });
    strategies.push({
      query: variant,
      strategy: "browse",
    });
  }

  if (options.usedOnly !== false) {
    const primary = queryVariants[0];
    if (primary) {
      strategies.push({
        query: primary,
        categoryId: options.categoryId,
        strategy: "browse+category+used",
        usedOnly: true,
      });
    }
  }

  for (const strategy of strategies) {
    const attempt: SearchAttemptMeta = {
      query: strategy.query,
      categoryId: strategy.categoryId,
      strategy: strategy.strategy,
    };
    attempts.push(describeSearchAttempt(attempt));

    const outcome = await searchActiveListings(strategy.query, {
      limit: options.limit,
      categoryId: strategy.categoryId,
      fixedPriceOnly: options.fixedPriceOnly,
      usedOnly: strategy.usedOnly ?? options.usedOnly,
    });

    if (outcome.items.length > 0) {
      return { ...outcome, attempt, attempts };
    }

    if (outcome.error && !outcome.error.includes("invalid_scope")) {
      // Keep last error for debugging if all strategies fail
      continue;
    }
  }

  const last = await searchActiveListings(queryVariants[0] ?? "resale item", {
    limit: options.limit,
    categoryId: options.categoryId,
    fixedPriceOnly: options.fixedPriceOnly,
    usedOnly: options.usedOnly,
  });

  return {
    items: [],
    error: last.error ?? "No active listings found for any query variant",
    attempt: last.attempt,
    attempts,
  };
}

/** Verify Browse API connectivity with a minimal search. */
export async function probeBrowseApi(): Promise<{
  ok: boolean;
  itemCount: number;
  error?: string;
}> {
  try {
    const { data, status } = await ebayFetch<BrowseSearchResponse>(
      "/buy/browse/v1/item_summary/search",
      { q: "shoes", limit: 1 }
    );
    assertEbaySuccess(data, status, "Browse probe failed");
    const count = data.itemSummaries?.length ?? 0;
    return { ok: true, itemCount: count };
  } catch (error) {
    return {
      ok: false,
      itemCount: 0,
      error: error instanceof Error ? error.message : "Browse probe failed",
    };
  }
}
