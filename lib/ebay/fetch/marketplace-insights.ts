import type { EbayComparable } from "../types";
import { ebayFetch } from "./http";

interface SoldSearchResponse {
  itemSales?: Array<{
    itemId?: string;
    title?: string;
    lastSoldPrice?: { value?: string; currency?: string };
    lastSoldDate?: string;
    condition?: string;
    itemWebUrl?: string;
  }>;
  errors?: Array<{ message?: string; errorId?: number; domain?: string }>;
}

export interface SoldSearchOutcome {
  items: EbayComparable[];
  available: boolean;
  error?: string;
}

/**
 * Sold / completed listings — Marketplace Insights API (limited release).
 * https://developer.ebay.com/api-docs/buy/marketplace-insights/resources/item_sales/methods/search
 *
 * May return 403 if your developer key lacks Marketplace Insights access.
 */
export async function searchSoldListings(
  query: string,
  options: { limit?: number; categoryId?: string } = {}
): Promise<SoldSearchOutcome> {
  const limit = Math.min(options.limit ?? 10, 50);

  const queryParams: Record<string, string | number> = {
    q: query.slice(0, 100),
    limit,
  };
  // Insights API often expects category scope
  if (options.categoryId) {
    queryParams.category_ids = options.categoryId;
  }

  try {
    const { data, status } = await ebayFetch<SoldSearchResponse>(
      "/buy/marketplace-insights/v1/item_sales/search",
      queryParams
    );

    if (status === 403 || status === 401) {
      return {
        items: [],
        available: false,
        error: "Marketplace Insights API not enabled for your eBay developer account.",
      };
    }

    if (status < 200 || status >= 300) {
      const msg = data.errors?.[0]?.message ?? `Marketplace Insights error (${status})`;
      return { items: [], available: false, error: msg };
    }

    const items: EbayComparable[] = [];
    for (const sale of data.itemSales ?? []) {
      const price = parseFloat(sale.lastSoldPrice?.value ?? "0");
      if (!Number.isFinite(price) || price <= 0) continue;
      items.push({
        ebayItemId: sale.itemId,
        title: sale.title ?? "Sold listing",
        price,
        condition: sale.condition,
        soldDate: sale.lastSoldDate,
        url: sale.itemWebUrl,
        listingType: "sold",
        source: "ebay-sold",
      });
    }

    return { items, available: true };
  } catch (error) {
    return {
      items: [],
      available: false,
      error: error instanceof Error ? error.message : "Sold search failed",
    };
  }
}
