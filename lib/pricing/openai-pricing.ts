import { encodeImagesForVision } from "@/lib/ai/encode-images";
import type { DeterminePriceInput, PriceRecommendation } from "./types";
import type { ComparableStats } from "./types";
import { computeComparableStats } from "./comparable-stats";
import {
  buildOpenAIPricingUserPrompt,
  OPENAI_PRICING_SYSTEM_PROMPT,
} from "./openai-pricing-prompt";
import { applyPriceFloors, parseOpenAIPriceResponse } from "./parse-price-response";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
}

export async function determinePriceWithOpenAI(
  input: DeterminePriceInput,
  stats: ComparableStats | null
): Promise<PriceRecommendation> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not set");
  }

  const model = process.env.OPENAI_PRICING_MODEL?.trim() || "gpt-4o";
  const encodedImages = await encodeImagesForVision(input.imagePaths);
  const userText = buildOpenAIPricingUserPrompt(input, stats, encodedImages.length > 0);

  const userContent: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string; detail: "high" | "low" } }
  > = [{ type: "text", text: userText }];

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
      temperature: 0.2,
      max_tokens: 800,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: OPENAI_PRICING_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    }),
  });

  const body = (await response.json()) as OpenAIChatResponse;
  if (!response.ok) {
    throw new Error(body.error?.message ?? `OpenAI pricing API error (${response.status})`);
  }

  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI pricing returned empty content");

  const parsed = JSON.parse(content) as unknown;
  const partial = parseOpenAIPriceResponse(parsed, stats);

  const recommendation = applyPriceFloors(
    {
      ...partial,
      method: "openai-vision",
      stats,
    },
    input.notes.minPrice
  );

  if (encodedImages.length === 0) {
    recommendation.pricingConfidence = Math.min(recommendation.pricingConfidence, 0.5);
    recommendation.rationale +=
      " (No photos were analyzed; confidence reduced.)";
  }

  return recommendation;
}
