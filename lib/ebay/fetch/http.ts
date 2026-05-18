import { getEbayApplicationToken } from "../application-token";
import { getEbayConfig } from "@/lib/utils/ebay-config";

export const EBAY_MARKETPLACE_ID = "EBAY_US";
export const US_CATEGORY_TREE_ID = "0";

export async function ebayFetch<T>(
  path: string,
  query?: Record<string, string | number | undefined>
): Promise<{ data: T; status: number }> {
  const config = getEbayConfig();
  const token = await getEbayApplicationToken();

  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") {
        params.set(key, String(value));
      }
    }
  }

  const qs = params.toString();
  const url = `${config.apiBase}${path}${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": EBAY_MARKETPLACE_ID,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  const data = (await res.json()) as T;
  return { data, status: res.status };
}

export function isEbayConfigured(): boolean {
  return getEbayConfig().isConfigured;
}
