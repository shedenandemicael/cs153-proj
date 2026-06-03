import type { CategorySuggestion } from "../types";
import { getEbayResearchConfig } from "@/lib/utils/ebay-config";
import { ebayFetch, US_CATEGORY_TREE_ID } from "./http";
import { MOCK_CATEGORIES } from "../mock-data";

interface TaxonomyResponse {
  categorySuggestions?: Array<{
    category?: {
      categoryId?: string;
      categoryName?: string;
    };
  }>;
  errors?: Array<{ message?: string }>;
}

/**
 * Category suggestions for narrowing search.
 * https://developer.ebay.com/api-docs/commerce/taxonomy/resources/category_tree/methods/getCategorySuggestions
 */
export async function getCategorySuggestions(query: string): Promise<CategorySuggestion[]> {
  const config = getEbayResearchConfig();
  if (!query.trim()) {
    return config.isConfigured ? [] : MOCK_CATEGORIES;
  }

  if (!config.isConfigured) {
    return MOCK_CATEGORIES;
  }

  try {
    const { data, status } = await ebayFetch<TaxonomyResponse>(
      `/commerce/taxonomy/v1/category_tree/${US_CATEGORY_TREE_ID}/get_category_suggestions`,
      { q: query.slice(0, 100) }
    );

    if (status < 200 || status >= 300) {
      console.warn("[taxonomy] category suggestions failed:", data.errors?.[0]?.message ?? status);
      return [];
    }

    const suggestions =
      data.categorySuggestions
        ?.map((s) => ({
          categoryId: s.category?.categoryId ?? "",
          categoryName: s.category?.categoryName ?? "",
        }))
        .filter((s) => s.categoryId && s.categoryName) ?? [];

    return suggestions;
  } catch (error) {
    console.warn("[taxonomy] category suggestions error:", error);
    return [];
  }
}

/** Best category id for sold search (Insights works better with a category). */
export async function resolveCategoryId(
  query: string,
  explicitCategoryId?: string
): Promise<string | undefined> {
  if (explicitCategoryId) return explicitCategoryId;
  const suggestions = await getCategorySuggestions(query);
  return suggestions[0]?.categoryId;
}

/** Verify Taxonomy API connectivity. */
export async function probeTaxonomyApi(): Promise<{ ok: boolean; categoryCount: number; error?: string }> {
  try {
    const suggestions = await getCategorySuggestions("shoes");
    return { ok: suggestions.length > 0, categoryCount: suggestions.length };
  } catch (error) {
    return {
      ok: false,
      categoryCount: 0,
      error: error instanceof Error ? error.message : "Taxonomy probe failed",
    };
  }
}
