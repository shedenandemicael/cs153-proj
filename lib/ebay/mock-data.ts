import type { EbayComparable } from "./types";

/** Deterministic pseudo-random from query for varied mock prices */
function seedFromQuery(query: string): number {
  let h = 0;
  for (let i = 0; i < query.length; i++) {
    h = (h * 31 + query.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function getMockComparables(query: string): EbayComparable[] {
  const base = query.slice(0, 40) || "resale item";
  const seed = seedFromQuery(query);
  const basePrice = 25 + (seed % 80);

  const soldOffsets = [0, -0.1, 0.15];
  const activeOffsets = [0.05, 0.2, -0.05];

  const sold: EbayComparable[] = soldOffsets.map((offset, i) => {
    const price = Math.round(basePrice * (1 + offset) * 100) / 100;
    const daysAgo = 5 + i * 8 + (seed % 10);
    return {
      ebayItemId: `mock-sold-${1000 + i}`,
      title: `[Sold] ${base} — comp ${i + 1}`,
      price: Math.max(9.99, price),
      condition: "Pre-owned",
      soldDate: new Date(Date.now() - daysAgo * 86400000).toISOString(),
      url: undefined,
      listingType: "sold",
      source: "mock",
    };
  });

  const active: EbayComparable[] = activeOffsets.map((offset, i) => {
    const price = Math.round(basePrice * (1 + offset) * 100) / 100;
    return {
      ebayItemId: `mock-active-${2000 + i}`,
      title: `[Active] ${base} — listing ${i + 1}`,
      price: Math.max(9.99, price),
      condition: i === 2 ? "New with tags" : "Pre-owned",
      listingType: "active",
      source: "mock",
    };
  });

  return [...sold, ...active];
}

export const MOCK_CATEGORIES = [
  { categoryId: "11450", categoryName: "Clothing, Shoes & Accessories", confidence: 0.78 },
  { categoryId: "267", categoryName: "Books", confidence: 0.12 },
  { categoryId: "293", categoryName: "Electronics", confidence: 0.1 },
];
