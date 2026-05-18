import type { GeneratedListing } from "@/types";

interface RawListing {
  title?: unknown;
  descriptionBullets?: unknown;
  itemSpecifics?: unknown;
  conditionDesc?: unknown;
  categoryId?: unknown;
  categoryName?: unknown;
  startingPrice?: unknown;
  buyItNowPrice?: unknown;
  shippingAssumptions?: unknown;
  confidenceScore?: unknown;
  warnings?: unknown;
  questions?: unknown;
}

export function parseGeneratedListing(raw: unknown): GeneratedListing {
  if (!raw || typeof raw !== "object") {
    throw new Error("OpenAI response was not a JSON object");
  }

  const data = raw as RawListing;

  const title = String(data.title ?? "").trim().slice(0, 80);
  if (!title) throw new Error("OpenAI response missing title");

  const descriptionBullets = normalizeStringArray(data.descriptionBullets, "descriptionBullets");
  if (descriptionBullets.length === 0) {
    throw new Error("OpenAI response missing descriptionBullets");
  }

  const itemSpecifics = normalizeRecord(data.itemSpecifics);
  const conditionDesc = String(data.conditionDesc ?? "").trim();
  if (!conditionDesc) throw new Error("OpenAI response missing conditionDesc");

  const startingPrice = normalizePrice(data.startingPrice, "startingPrice");
  const buyItNowPrice =
    data.buyItNowPrice == null ? undefined : normalizePrice(data.buyItNowPrice, "buyItNowPrice");

  const confidenceScore = normalizeConfidence(data.confidenceScore);

  return {
    title,
    descriptionBullets,
    itemSpecifics,
    conditionDesc,
    categoryId: data.categoryId != null ? String(data.categoryId) : undefined,
    categoryName: data.categoryName != null ? String(data.categoryName) : undefined,
    startingPrice,
    buyItNowPrice,
    shippingAssumptions:
      String(data.shippingAssumptions ?? "USPS Ground Advantage, buyer pays calculated shipping").trim(),
    confidenceScore,
    warnings: normalizeStringArray(data.warnings, "warnings", true),
    questions: normalizeStringArray(data.questions, "questions", true),
  };
}

function normalizeStringArray(value: unknown, field: string, optional = false): string[] {
  if (value == null) {
    if (optional) return [];
    throw new Error(`OpenAI response missing ${field}`);
  }
  if (!Array.isArray(value)) throw new Error(`OpenAI response ${field} must be an array`);
  return value.map((v) => String(v).trim()).filter(Boolean);
}

function normalizeRecord(value: unknown): Record<string, string> {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value)) {
    if (v != null) out[k] = String(v).trim();
  }
  return out;
}

function normalizePrice(value: unknown, field: string): number {
  const n = typeof value === "number" ? value : parseFloat(String(value));
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`OpenAI response invalid ${field}`);
  }
  return Math.round(n * 100) / 100;
}

function normalizeConfidence(value: unknown): number {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? 0.5));
  if (!Number.isFinite(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}
