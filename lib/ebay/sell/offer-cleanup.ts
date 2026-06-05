import { EbayApiError } from "@/lib/ebay/fetch/errors";
import { EBAY_MARKETPLACE_ID } from "../fetch/http";
import { ebaySellFetch } from "./http";

interface GetOffersResponse {
  offers?: Array<{
    offerId?: string;
    format?: string;
    status?: string;
    listing?: { listingId?: string };
  }>;
}

/** eBay 25713 — offer ended, deleted, or otherwise unusable (common in sandbox after relist cycles). */
export function isOfferUnavailableError(error: unknown): boolean {
  if (error instanceof EbayApiError) return error.errorId === 25713;
  return error instanceof Error && /25713|offer is not available/i.test(error.message);
}

function isIgnorableCleanupError(error: unknown): boolean {
  if (error instanceof EbayApiError) {
    return error.status === 404 || error.errorId === 25713;
  }
  return false;
}

export async function deleteOfferSafe(offerId: string): Promise<void> {
  try {
    await ebaySellFetch(`/sell/inventory/v1/offer/${encodeURIComponent(offerId)}`, {
      method: "DELETE",
    });
  } catch (error) {
    if (!isIgnorableCleanupError(error)) throw error;
  }
}

export async function deleteInventoryItemSafe(sku: string): Promise<void> {
  try {
    await ebaySellFetch(`/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`, {
      method: "DELETE",
    });
  } catch (error) {
    if (!isIgnorableCleanupError(error)) throw error;
  }
}

export async function safeGetFixedPriceOfferForSku(sku: string): Promise<{
  offerId: string;
  status?: string;
  listingId?: string;
} | null> {
  try {
    const data = await ebaySellFetch<GetOffersResponse>("/sell/inventory/v1/offer", {
      query: {
        sku,
        marketplace_id: EBAY_MARKETPLACE_ID,
        format: "FIXED_PRICE",
        limit: 20,
      },
    });

    const offer =
      data.offers?.find((o) => o.format === "FIXED_PRICE") ?? data.offers?.[0];

    if (!offer?.offerId) return null;

    return {
      offerId: offer.offerId,
      status: offer.status,
      listingId: offer.listing?.listingId,
    };
  } catch (error) {
    if (isOfferUnavailableError(error) || isIgnorableCleanupError(error)) {
      return null;
    }
    throw error;
  }
}

async function deleteAllOffersForSku(sku: string): Promise<void> {
  try {
    const data = await ebaySellFetch<GetOffersResponse>("/sell/inventory/v1/offer", {
      query: {
        sku,
        marketplace_id: EBAY_MARKETPLACE_ID,
        limit: 100,
      },
    });

    for (const offer of data.offers ?? []) {
      if (offer.offerId) {
        await deleteOfferSafe(offer.offerId);
      }
    }
  } catch (error) {
    if (!isOfferUnavailableError(error) && !isIgnorableCleanupError(error)) {
      console.warn(`[deleteAllOffersForSku] getOffers failed for ${sku}:`, error);
    }
  }
}

/** Delete all offers for a SKU (keeps inventory item). */
export async function resetEbayOffersForSku(sku: string): Promise<void> {
  await deleteAllOffersForSku(sku);
}

/** Delete all offers + inventory for a SKU so publish starts from a clean sandbox state. */
export async function resetEbaySkuForPublish(sku: string): Promise<void> {
  await deleteAllOffersForSku(sku);
  await deleteInventoryItemSafe(sku);
}
