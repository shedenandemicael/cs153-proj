import type { GeneratedListing, ListingGenerationInput } from "@/types";

export interface LLMProvider {
  readonly name: string;
  generateListing(input: ListingGenerationInput): Promise<GeneratedListing>;
}
