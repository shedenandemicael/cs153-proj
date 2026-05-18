import type { GeneratedListing, ListingGenerationInput } from "@/types";
import type { LLMProvider } from "./types";
import { MockLLMProvider } from "./mock-provider";
import { encodeImagesForVision } from "./encode-images";
import { buildOpenAIUserPrompt, OPENAI_LISTING_SYSTEM_PROMPT } from "./openai-prompt";
import { parseGeneratedListing } from "./parse-generated-listing";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

interface OpenAIChatResponse {
  choices?: Array<{
    message?: { content?: string | null };
    finish_reason?: string;
  }>;
  error?: { message?: string; type?: string };
}

/**
 * OpenAI vision + structured JSON listing generation.
 * Requires OPENAI_API_KEY and LLM_PROVIDER=openai.
 */
export class OpenAILLMProvider implements LLMProvider {
  readonly name = "openai";
  private fallback = new MockLLMProvider();

  async generateListing(input: ListingGenerationInput): Promise<GeneratedListing> {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      console.warn("[OpenAILLMProvider] OPENAI_API_KEY not set; using mock output.");
      return this.fallback.generateListing(input);
    }

    const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
    const encodedImages = await encodeImagesForVision(input.imagePaths);
    const userText = buildOpenAIUserPrompt(input, encodedImages.length > 0);

    const userContent: Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string; detail: "low" | "high" | "auto" } }
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
        temperature: 0.4,
        max_tokens: 2048,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: OPENAI_LISTING_SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      }),
    });

    const body = (await response.json()) as OpenAIChatResponse;

    if (!response.ok) {
      const msg = body.error?.message ?? `OpenAI API error (${response.status})`;
      throw new Error(msg);
    }

    const content = body.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI returned an empty response");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("OpenAI response was not valid JSON");
    }

    const listing = parseGeneratedListing(parsed);

    if (encodedImages.length === 0) {
      listing.warnings = [
        ...listing.warnings,
        "No product photos were available for vision analysis — review carefully.",
      ];
      listing.confidenceScore = Math.min(listing.confidenceScore, 0.45);
    }

    if (input.priceRecommendation) {
      listing.startingPrice = input.priceRecommendation.startingPrice;
      listing.buyItNowPrice = input.priceRecommendation.buyItNowPrice;
    } else if (input.notes.minPrice != null && listing.startingPrice < input.notes.minPrice) {
      listing.startingPrice = input.notes.minPrice;
      listing.warnings = [
        ...listing.warnings,
        `Starting price raised to your minimum ($${input.notes.minPrice.toFixed(2)}).`,
      ];
    }

    return listing;
  }
}
