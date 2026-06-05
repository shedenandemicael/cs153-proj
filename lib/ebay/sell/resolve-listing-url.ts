import type { AgentStepLog } from "@/lib/agent/types";
import { EBAY_MARKETPLACE_ID } from "../fetch/http";
import { getEbaySellConfig } from "@/lib/utils/ebay-config";
import { ebaySellFetch } from "./http";

const SANDBOX_ITM_URL = /https:\/\/www\.sandbox\.ebay\.com\/itm\/\d+/;
const PROD_ITM_URL = /https:\/\/www\.ebay\.com\/itm\/\d+/;
const LISTING_ID_IN_MESSAGE = /listing[ (\s]+(\d{8,})/i;

function listingUrlForId(listingId: string): string {
  const config = getEbaySellConfig();
  const base = config.env === "sandbox" ? "https://www.sandbox.ebay.com" : "https://www.ebay.com";
  return `${base}/itm/${listingId}`;
}

/** Recover URL from agent step logs (e.g. publish before ebayListingUrl was persisted). */
export function parseListingUrlFromSteps(steps: AgentStepLog[]): string | null {
  for (const step of [...steps].reverse()) {
    if (step.status !== "completed") continue;

    const sandbox = step.message.match(SANDBOX_ITM_URL);
    if (sandbox) return sandbox[0];

    const prod = step.message.match(PROD_ITM_URL);
    if (prod) return prod[0];

    const idMatch = step.message.match(LISTING_ID_IN_MESSAGE);
    if (idMatch) return listingUrlForId(idMatch[1]);
  }
  return null;
}

/** Look up live listing URL from eBay Inventory API using the item SKU. */
export async function fetchListingUrlForSku(sku: string): Promise<string | null> {
  try {
    const data = await ebaySellFetch<{
      offers?: Array<{ listing?: { listingId?: string }; status?: string }>;
    }>("/sell/inventory/v1/offer", {
      query: {
        sku,
        marketplace_id: EBAY_MARKETPLACE_ID,
        format: "FIXED_PRICE",
        limit: 10,
      },
    });

    const published = data.offers?.find(
      (o) => o.status === "PUBLISHED" && o.listing?.listingId
    );
    const anyWithListing = data.offers?.find((o) => o.listing?.listingId);
    const listingId = published?.listing?.listingId ?? anyWithListing?.listing?.listingId;
    return listingId ? listingUrlForId(listingId) : null;
  } catch {
    return null;
  }
}

export async function resolveEbayListingUrl(params: {
  itemId: string;
  savedUrl?: string | null;
  agentSteps?: AgentStepLog[];
}): Promise<string | null> {
  if (params.savedUrl?.trim()) return params.savedUrl.trim();

  const fromSteps = params.agentSteps?.length
    ? parseListingUrlFromSteps(params.agentSteps)
    : null;
  if (fromSteps) return fromSteps;

  return fetchListingUrlForSku(`cs153-${params.itemId}`);
}
