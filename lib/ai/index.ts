import { MockLLMProvider } from "./mock-provider";
import { OpenAILLMProvider } from "./openai-provider";
import { WorkersAILLMProvider } from "./workers-ai-provider";
import type { LLMProvider } from "./types";

let cachedProvider: LLMProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (cachedProvider) return cachedProvider;

  const provider = (process.env.LLM_PROVIDER ?? "mock").toLowerCase();

  switch (provider) {
    case "openai":
      cachedProvider = new OpenAILLMProvider();
      break;
    case "workers-ai":
      cachedProvider = new WorkersAILLMProvider();
      break;
    case "mock":
    default:
      cachedProvider = new MockLLMProvider();
      break;
  }

  return cachedProvider;
}

export { type LLMProvider } from "./types";
