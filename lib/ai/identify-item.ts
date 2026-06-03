import { encodeImagesForVision } from "@/lib/ai/encode-images";
import type { ItemNotes } from "@/types";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

export interface ItemIdentification {
  brand?: string;
  model?: string;
  productType?: string;
  size?: string;
  color?: string;
  condition?: string;
  /** Short keyword phrase optimized for eBay active listing search. */
  ebaySearchQuery: string;
}

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
}

const IDENTIFY_SYSTEM_PROMPT = `You identify resale items from product photos for eBay market research.

Rules:
- Identify brand, model/style name, product type, visible size, color, and condition from the photos.
- ebaySearchQuery must be a concise eBay search phrase (3–8 words) using brand + model + product type.
  Example: "Nike Air Max 90 sneakers" — never use vague terms like "resale item" or "clothing".
- Only include size in ebaySearchQuery when clearly visible on tags/labels.
- Do not invent details that are not visible.
- Output valid JSON only.`;

function buildIdentifyUserPrompt(notes: ItemNotes | undefined, hasImages: boolean): string {
  const lines = [
    "Identify this item for eBay comparables search.",
    "",
    "Seller notes (may be empty):",
    `- Brand: ${notes?.brand ?? "(not provided)"}`,
    `- Size: ${notes?.size ?? "(not provided)"}`,
    `- Condition: ${notes?.condition ?? "(not provided)"}`,
    `- Notes: ${notes?.freeformNotes ?? "(none)"}`,
    "",
  ];

  if (hasImages) {
    lines.push("Product photos are attached.");
  }

  lines.push(
    "",
    "Return JSON:",
    `{`,
    `  "brand": "string or null",`,
    `  "model": "string or null",`,
    `  "productType": "string or null",`,
    `  "size": "string or null",`,
    `  "color": "string or null",`,
    `  "condition": "string or null",`,
    `  "ebaySearchQuery": "string (required, specific eBay search phrase)"`,
    `}`
  );

  return lines.join("\n");
}

function parseIdentification(raw: unknown): ItemIdentification | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;

  const str = (key: string): string | undefined => {
    const value = data[key];
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  };

  const brand = str("brand");
  const model = str("model");
  const productType = str("productType");
  let ebaySearchQuery = str("ebaySearchQuery") ?? "";

  const vague = /^(resale\s+item|item|product|clothing|shoes|accessories)$/i;
  if (!ebaySearchQuery || vague.test(ebaySearchQuery)) {
    ebaySearchQuery = [brand, model, productType].filter(Boolean).join(" ").trim();
  }
  if (!ebaySearchQuery || vague.test(ebaySearchQuery)) return null;

  return {
    brand,
    model,
    productType,
    size: str("size"),
    color: str("color"),
    condition: str("condition"),
    ebaySearchQuery,
  };
}

/** Use vision to identify an item and build a specific eBay search query. */
export async function identifyItemFromImages(
  imagePaths: string[],
  notes?: ItemNotes
): Promise<ItemIdentification | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey || imagePaths.length === 0) return null;

  const encodedImages = await encodeImagesForVision(imagePaths);
  if (encodedImages.length === 0) return null;

  const model =
    process.env.OPENAI_PRICING_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || "gpt-4o";

  const userContent: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string; detail: "high" | "low" } }
  > = [{ type: "text", text: buildIdentifyUserPrompt(notes, true) }];

  for (const img of encodedImages) {
    userContent.push({
      type: "image_url",
      image_url: { url: img.dataUrl, detail: "high" },
    });
  }

  const response = await fetch(OPENAI_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: 400,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: IDENTIFY_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    }),
  });

  const body = (await response.json()) as OpenAIChatResponse;
  if (!response.ok) {
    console.warn("[identifyItemFromImages] OpenAI error:", body.error?.message ?? response.status);
    return null;
  }

  const content = body.choices?.[0]?.message?.content;
  if (!content) return null;

  try {
    return parseIdentification(JSON.parse(content) as unknown);
  } catch {
    console.warn("[identifyItemFromImages] Failed to parse identification JSON");
    return null;
  }
}
