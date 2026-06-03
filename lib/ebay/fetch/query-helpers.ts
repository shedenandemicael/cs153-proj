/** Build progressively broader search queries when the first attempt returns no results. */
export function buildSearchQueryVariants(query: string): string[] {
  const normalized = query.trim().replace(/\s+/g, " ");
  if (!normalized) return ["resale item"];

  const variants: string[] = [];
  const add = (value: string) => {
    const v = value.trim();
    if (v && !variants.includes(v)) variants.push(v);
  };

  add(normalized);

  const tokens = normalized.split(" ").filter(Boolean);
  if (tokens.length > 4) {
    add(tokens.slice(0, 4).join(" "));
  }
  if (tokens.length > 2) {
    add(tokens.slice(0, 2).join(" "));
  }
  if (tokens.length > 1) {
    add(tokens[0]);
  }

  return variants;
}

export interface SearchAttemptMeta {
  query: string;
  categoryId?: string;
  strategy: string;
}

export function describeSearchAttempt(attempt: SearchAttemptMeta): string {
  const category = attempt.categoryId ? `, category ${attempt.categoryId}` : "";
  return `${attempt.strategy}: "${attempt.query}"${category}`;
}
