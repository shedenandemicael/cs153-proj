import { getEbaySellConfig } from "@/lib/utils/ebay-config";
import { ebayErrorFromResponse } from "../fetch/errors";
import { getValidUserAccessToken } from "../oauth/user-token";

const REQUEST_TIMEOUT_MS = 30_000;

export async function ebaySellFetch<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: unknown;
    query?: Record<string, string | number | undefined>;
  } = {}
): Promise<T> {
  const config = getEbaySellConfig();
  const token = await getValidUserAccessToken();
  const method = options.method ?? "GET";

  const params = new URLSearchParams();
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined && value !== "") params.set(key, String(value));
    }
  }

  const qs = params.toString();
  const url = `${config.sellApiBase}${path}${qs ? `?${qs}` : ""}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "Content-Language": "en-US",
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    const text = await res.text();
    let data: T;
    try {
      data = (text ? JSON.parse(text) : {}) as T;
    } catch {
      throw new Error(`eBay Sell API returned non-JSON (HTTP ${res.status})`);
    }

    if (res.status < 200 || res.status >= 300) {
      throw ebayErrorFromResponse(data, res.status, `eBay Sell API ${method} ${path} failed`);
    }

    return data;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`eBay Sell request timed out after ${REQUEST_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
