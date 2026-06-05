import { getCategoryAspects } from "../fetch/category-aspects";

const DEPARTMENT_FALLBACK_ORDER = [
  "Unisex Adults",
  "Women",
  "Men",
  "Girls",
  "Boys",
  "Teens",
  "Kids",
  "Unisex Kids",
];

function normalizeKey(key: string): string {
  return key.trim().toLowerCase();
}

function findDraftValue(
  specifics: Record<string, string>,
  aspectName: string
): string | undefined {
  const target = normalizeKey(aspectName);
  for (const [key, value] of Object.entries(specifics)) {
    if (normalizeKey(key) === target && value?.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function pickAllowedValue(allowedValues: string[], aspectName: string): string | undefined {
  if (allowedValues.length === 0) return undefined;

  if (normalizeKey(aspectName) === "department") {
    for (const preferred of DEPARTMENT_FALLBACK_ORDER) {
      const match = allowedValues.find(
        (v) => normalizeKey(v) === normalizeKey(preferred)
      );
      if (match) return match;
    }
  }

  return allowedValues[0];
}

/**
 * Merge draft item specifics with Taxonomy-required aspects so Inventory API publish succeeds.
 */
export async function buildInventoryAspects(params: {
  categoryId: string;
  itemSpecifics: Record<string, string>;
}): Promise<Record<string, string[]>> {
  const merged: Record<string, string> = { ...params.itemSpecifics };
  const meta = await getCategoryAspects(params.categoryId);
  const missingRequired: string[] = [];

  for (const aspect of meta) {
    if (!aspect.required) continue;

    const existing = findDraftValue(merged, aspect.name);
    if (existing) {
      merged[aspect.name] = existing;
      continue;
    }

    const fallback = pickAllowedValue(aspect.allowedValues, aspect.name);
    if (fallback) {
      merged[aspect.name] = fallback;
      continue;
    }

    if (normalizeKey(aspect.name) === "brand") {
      const brand =
        findDraftValue(merged, "Brand") ?? merged.Brand ?? merged.brand;
      if (brand?.trim()) {
        merged[aspect.name] = brand.trim();
        continue;
      }
    }

    missingRequired.push(aspect.name);
  }

  if (missingRequired.length > 0) {
    throw new Error(
      `Missing required eBay item specifics for this category: ${missingRequired.join(", ")}. ` +
        "Edit the draft item specifics on the review page (e.g. Department: Women) and publish again."
    );
  }

  if (meta.length === 0 && !findDraftValue(merged, "Department")) {
    merged.Department = DEPARTMENT_FALLBACK_ORDER[0];
  }

  const aspects: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(merged)) {
    if (value?.trim()) aspects[key] = [value.trim()];
  }

  return aspects;
}
