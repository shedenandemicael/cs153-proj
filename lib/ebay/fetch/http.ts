import {
  clearEbayApplicationTokenCache,
  getEbayApplicationToken,
} from "../application-token";
import { ebayErrorFromResponse } from "./errors";
import { getEbayResearchConfig } from "@/lib/utils/ebay-config";

export const EBAY_MARKETPLACE_ID = "EBAY_US";
export const US_CATEGORY_TREE_ID = "0";

const REQUEST_TIMEOUT_MS = 15_000;

export async function ebayFetch<T>(
  path: string,
  query?: Record<string, string | number | undefined>,
  options: { retryOnUnauthorized?: boolean } = {}
): Promise<{ data: T; status: number }> {
  const config = getEbayResearchConfig();
  const retryOnUnauthorized = options.retryOnUnauthorized ?? true;

  const run = async (attempt: number) => {
    const token = await getEbayApplicationToken(config.researchEnv);

    const params = new URLSearchParams();
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== "") {
          params.set(key, String(value));
        }
      }
    }

    const qs = params.toString();
    const url = `${config.researchApiBase}${path}${qs ? `?${qs}` : ""}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          "X-EBAY-C-MARKETPLACE-ID": EBAY_MARKETPLACE_ID,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      const text = await res.text();
      let data: T;
      try {
        data = (text ? JSON.parse(text) : {}) as T;
      } catch {
        throw new Error(`eBay returned non-JSON response (HTTP ${res.status})`);
      }

      if (res.status === 401 && retryOnUnauthorized && attempt === 0) {
        clearEbayApplicationTokenCache(config.researchEnv);
        return run(1);
      }

      return { data, status: res.status };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`eBay request timed out after ${REQUEST_TIMEOUT_MS}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  };

  return run(0);
}

export function isEbayConfigured(): boolean {
  return getEbayResearchConfig().isConfigured;
}

export function assertEbaySuccess<T>(
  data: T,
  status: number,
  fallbackMessage: string
): void {
  if (status >= 200 && status < 300) return;
  throw ebayErrorFromResponse(data, status, fallbackMessage);
}
