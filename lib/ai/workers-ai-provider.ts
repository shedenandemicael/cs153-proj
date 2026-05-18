import type { GeneratedListing, ListingGenerationInput } from "@/types";
import type { LLMProvider } from "./types";
import { MockLLMProvider } from "./mock-provider";

/**
 * Cloudflare Workers AI provider stub.
 * TODO: Wire @cloudflare/ai or REST API when credentials are available.
 */
export class WorkersAILLMProvider implements LLMProvider {
  readonly name = "workers-ai";
  private fallback = new MockLLMProvider();

  async generateListing(input: ListingGenerationInput): Promise<GeneratedListing> {
    const accountId = process.env.WORKERS_AI_ACCOUNT_ID;
    const token = process.env.WORKERS_AI_API_TOKEN;
    if (!accountId || !token) {
      console.warn("[WorkersAILLMProvider] Credentials not set; using mock output.");
      return this.fallback.generateListing(input);
    }

    // TODO: Real Workers AI call
    console.warn("[WorkersAILLMProvider] Real API not wired yet; using mock output.");
    return this.fallback.generateListing(input);
  }
}
