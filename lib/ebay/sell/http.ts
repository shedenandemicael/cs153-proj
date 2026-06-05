import { getEbaySellConfig } from "@/lib/utils/ebay-config";
import { ebayErrorFromResponse } from "../fetch/errors";
import { getValidUserAccessToken } from "../oauth/user-token";

const REQUEST_TIMEOUT_MS = 30_000;

/** Inventory API requires locale headers; Node fetch defaults Accept-Language to "*" which eBay rejects (25709). */
function isInventoryApiPath(path: string): boolean {
  return path.startsWith("/sell/inventory/");
}

function buildSellHeaders(token: string, path: string, hasBody: boolean): HeadersInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };

  if (isInventoryApiPath(path)) {
    headers["Accept-Language"] = "en-US";
    if (hasBody) {
      headers["Content-Type"] = "application/json";
      headers["Content-Language"] = "en-US";
    }
  } else if (hasBody) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

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

  const hasBody = options.body !== undefined;

  try {
    const res = await fetch(url, {
      method,
      signal: controller.signal,
      headers: buildSellHeaders(token, path, hasBody),
      body: hasBody ? JSON.stringify(options.body) : undefined,
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
