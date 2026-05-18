import type { CategorySuggestion } from "../types";
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
 * Category suggestions for narrowing Insights search.
 * https://developer.ebay.com/api-docs/commerce/taxonomy/resources/category_tree/methods/getCategorySuggestions
 */
export async function getCategorySuggestions(query: string): Promise<CategorySuggestion[]> {
  if (!query.trim()) return MOCK_CATEGORIES;

  try {
    const { data, status } = await ebayFetch<TaxonomyResponse>(
      `/commerce/taxonomy/v1/category_tree/${US_CATEGORY_TREE_ID}/get_category_suggestions`,
      { q: query.slice(0, 100) }
    );

    if (status < 200 || status >= 300) {
      return MOCK_CATEGORIES;
    }

    const suggestions =
      data.categorySuggestions
        ?.map((s) => ({
          categoryId: s.category?.categoryId ?? "",
          categoryName: s.category?.categoryName ?? "",
        }))
        .filter((s) => s.categoryId && s.categoryName) ?? [];

    return suggestions.length > 0 ? suggestions : MOCK_CATEGORIES;
  } catch {
    return MOCK_CATEGORIES;
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
