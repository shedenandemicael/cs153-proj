import type { EbayComparable } from "../types";
import { ebayFetch } from "./http";

interface BrowseSearchResponse {
  itemSummaries?: Array<{
    itemId?: string;
    title?: string;
    price?: { value?: string; currency?: string };
    condition?: string;
    itemWebUrl?: string;
  }>;
  errors?: Array<{ message?: string; errorId?: number }>;
}

/**
 * Active (live) listings — eBay Browse API
 * https://developer.ebay.com/api-docs/buy/browse/resources/item_summary/methods/search
 */
export async function searchActiveListings(
  query: string,
  options: { limit?: number; categoryId?: string } = {}
): Promise<EbayComparable[]> {
  const limit = Math.min(options.limit ?? 10, 50);

  const queryParams: Record<string, string | number> = {
    q: query.slice(0, 100),
    limit,
    sort: "price",
  };
  if (options.categoryId) {
    queryParams.category_ids = options.categoryId;
  }

  const { data, status } = await ebayFetch<BrowseSearchResponse>(
    "/buy/browse/v1/item_summary/search",
    queryParams
  );

  if (status < 200 || status >= 300) {
    const msg = data.errors?.[0]?.message ?? `Browse API error (${status})`;
    throw new Error(msg);
  }

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
