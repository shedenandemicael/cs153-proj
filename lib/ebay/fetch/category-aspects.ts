import { ebayFetch, US_CATEGORY_TREE_ID } from "./http";

export interface CategoryAspectMeta {
  name: string;
  required: boolean;
  allowedValues: string[];
}

interface ItemAspectsResponse {
  aspects?: Array<{
    localizedAspectName?: string;
    aspectConstraint?: {
      aspectRequired?: boolean;
    };
    aspectValues?: Array<{ localizedValue?: string }>;
  }>;
  errors?: Array<{ message?: string }>;
}

/**
 * Required/recommended item specifics for a leaf category (Taxonomy API).
 * https://developer.ebay.com/api-docs/commerce/taxonomy/resources/category_tree/methods/getItemAspectsForCategory
 */
export async function getCategoryAspects(categoryId: string): Promise<CategoryAspectMeta[]> {
  if (!categoryId.trim()) return [];

  try {
    const { data, status } = await ebayFetch<ItemAspectsResponse>(
      `/commerce/taxonomy/v1/category_tree/${US_CATEGORY_TREE_ID}/get_item_aspects_for_category`,
      { category_id: categoryId }
    );

    if (status < 200 || status >= 300) {
      console.warn(
        "[taxonomy] get_item_aspects_for_category failed:",
        data.errors?.[0]?.message ?? status
      );
      return [];
    }

    return (
      data.aspects
        ?.map((aspect) => ({
          name: aspect.localizedAspectName?.trim() ?? "",
          required: aspect.aspectConstraint?.aspectRequired === true,
          allowedValues:
            aspect.aspectValues
              ?.map((v) => v.localizedValue?.trim())
              .filter((v): v is string => Boolean(v)) ?? [],
        }))
        .filter((a) => a.name) ?? []
    );
  } catch (error) {
    console.warn("[taxonomy] get_item_aspects_for_category error:", error);
    return [];
  }
}
