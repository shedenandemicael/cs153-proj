import { ebaySellFetch } from "./http";

/** Numeric condition ID → Inventory API ConditionEnum (eBay selling guide). */
const CONDITION_ID_TO_ENUM: Record<string, string> = {
  "1000": "NEW",
  "1500": "NEW_OTHER",
  "1750": "NEW_WITH_DEFECTS",
  "2000": "CERTIFIED_REFURBISHED",
  "2010": "EXCELLENT_REFURBISHED",
  "2020": "VERY_GOOD_REFURBISHED",
  "2030": "GOOD_REFURBISHED",
  "2500": "SELLER_REFURBISHED",
  "2750": "LIKE_NEW",
  "2990": "PRE_OWNED_EXCELLENT",
  "3000": "USED_EXCELLENT",
  "3010": "PRE_OWNED_FAIR",
  "4000": "USED_VERY_GOOD",
  "5000": "USED_GOOD",
  "6000": "USED_ACCEPTABLE",
  "7000": "FOR_PARTS_OR_NOT_WORKING",
};

interface ItemConditionPoliciesResponse {
  itemConditionPolicies?: Array<{
    categoryId?: string;
    itemConditionRequired?: boolean;
    itemConditions?: Array<{
      conditionId?: string;
      conditionDescription?: string;
    }>;
  }>;
}

const allowedByCategory = new Map<string, string[]>();

async function fetchAllowedConditionEnums(categoryId: string): Promise<string[]> {
  const cached = allowedByCategory.get(categoryId);
  if (cached) return cached;

  try {
    const data = await ebaySellFetch<ItemConditionPoliciesResponse>(
      "/sell/metadata/v1/marketplace/EBAY_US/get_item_condition_policies",
      {
        query: {
          filter: `categoryIds:{${categoryId}}`,
        },
      }
    );

    const policy =
      data.itemConditionPolicies?.find((p) => p.categoryId === categoryId) ??
      data.itemConditionPolicies?.[0];

    const allowed = [
      ...new Set(
        (policy?.itemConditions ?? [])
          .map((c) => CONDITION_ID_TO_ENUM[c.conditionId ?? ""])
          .filter((value): value is string => Boolean(value))
      ),
    ];

    allowedByCategory.set(categoryId, allowed);
    return allowed;
  } catch (error) {
    console.warn(`[category-conditions] metadata lookup failed for ${categoryId}:`, error);
    return [];
  }
}

const TEXT_TO_PREFERRED_ENUMS: Array<{ pattern: RegExp; enums: string[] }> = [
  { pattern: /new with (tags|box)|nwt|nwob|brand new/, enums: ["NEW"] },
  { pattern: /new without|new other|open box/, enums: ["NEW_OTHER", "NEW"] },
  { pattern: /like new|mint/, enums: ["LIKE_NEW", "PRE_OWNED_EXCELLENT", "USED_EXCELLENT"] },
  { pattern: /excellent/, enums: ["USED_EXCELLENT", "PRE_OWNED_EXCELLENT", "LIKE_NEW"] },
  { pattern: /very good|lightly used/, enums: ["USED_VERY_GOOD"] },
  { pattern: /\bgood\b|used - good/, enums: ["USED_GOOD", "USED_VERY_GOOD"] },
  { pattern: /\bused\b|pre-?owned/, enums: ["USED_EXCELLENT", "USED_GOOD", "USED_VERY_GOOD", "PRE_OWNED_EXCELLENT"] },
  { pattern: /fair|acceptable|used - acceptable/, enums: ["USED_ACCEPTABLE", "PRE_OWNED_FAIR"] },
  {
    pattern: /parts|not working|for parts/,
    enums: ["FOR_PARTS_OR_NOT_WORKING"],
  },
  { pattern: /refurb/, enums: ["SELLER_REFURBISHED", "CERTIFIED_REFURBISHED", "GOOD_REFURBISHED"] },
];

function pickFirstAllowed(preferred: string[], allowed: string[]): string | undefined {
  for (const value of preferred) {
    if (allowed.includes(value)) return value;
  }
  return undefined;
}

function fallbackEnum(allowed: string[]): string {
  const priority = [
    "USED_GOOD",
    "USED_VERY_GOOD",
    "USED_EXCELLENT",
    "LIKE_NEW",
    "PRE_OWNED_EXCELLENT",
    "NEW",
  ];
  for (const value of priority) {
    if (allowed.includes(value)) return value;
  }
  return allowed[0] ?? "USED_GOOD";
}

/** Resolve a category-valid Inventory API condition enum for publish. */
export async function resolveConditionForCategory(
  categoryId: string,
  conditionDesc: string,
  notesCondition?: string
): Promise<string> {
  const text = `${notesCondition ?? ""} ${conditionDesc}`.toLowerCase();
  const allowed = await fetchAllowedConditionEnums(categoryId);

  if (allowed.length > 0) {
    for (const rule of TEXT_TO_PREFERRED_ENUMS) {
      if (!rule.pattern.test(text)) continue;
      const match = pickFirstAllowed(rule.enums, allowed);
      if (match) return match;
    }
    return fallbackEnum(allowed);
  }

  return legacyMapConditionToEbayEnum(conditionDesc, notesCondition);
}

/** Legacy text-only mapper when Metadata API is unavailable. */
export function legacyMapConditionToEbayEnum(
  conditionDesc: string,
  notesCondition?: string
): string {
  const text = `${notesCondition ?? ""} ${conditionDesc}`.toLowerCase();

  if (/new with (tags|box)|nwt|nwob|brand new/.test(text)) return "NEW";
  if (/new without|new other|open box/.test(text)) return "NEW_OTHER";
  if (/like new|mint/.test(text)) return "LIKE_NEW";
  if (/excellent/.test(text)) return "USED_EXCELLENT";
  if (/very good|lightly used/.test(text)) return "USED_VERY_GOOD";
  if (/\bgood\b|used - good/.test(text)) return "USED_GOOD";
  if (/\bused\b|pre-?owned/.test(text)) return "USED_EXCELLENT";
  if (/fair|acceptable|used - acceptable/.test(text)) return "USED_ACCEPTABLE";
  if (/parts|not working|for parts/.test(text)) return "FOR_PARTS_OR_NOT_WORKING";

  return "USED_GOOD";
}
