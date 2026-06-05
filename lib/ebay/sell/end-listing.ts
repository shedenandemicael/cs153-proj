import { EbayApiError } from "@/lib/ebay/fetch/errors";
import { canPublishToEbay } from "@/lib/utils/ebay-config";
import { isEbaySellerConnected } from "../oauth/user-token";
import { spotItemSku } from "./item-sku";
import { getFixedPriceOfferForSku } from "./offer";
import { ebaySellFetch } from "./http";

export interface EndEbayListingResult {
  attempted: boolean;
  ended: boolean;
  warning?: string;
}

export function wasPublishedOnEbay(item: {
  status: string;
  listingDraft?: {
    ebayOfferId?: string | null;
    ebayListingUrl?: string | null;
    publishedAt?: Date | null;
  } | null;
}): boolean {
  if (item.status === "PUBLISHED") return true;
  const draft = item.listingDraft;
  if (!draft) return false;
  return Boolean(draft.ebayOfferId || draft.ebayListingUrl || draft.publishedAt);
}

function isIgnorableEndError(error: unknown): boolean {
  if (error instanceof EbayApiError) {
    if (error.status === 404) return true;
    return /not found|no offer|already (withdrawn|ended|deleted)/i.test(error.message);
  }
  return false;
}

async function deleteOfferById(offerId: string): Promise<void> {
  await ebaySellFetch(`/sell/inventory/v1/offer/${encodeURIComponent(offerId)}`, {
    method: "DELETE",
  });
}

async function deleteInventoryItemBySku(sku: string): Promise<void> {
  await ebaySellFetch(`/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`, {
    method: "DELETE",
  });
}

/**
 * End the eBay sandbox listing (if any) before removing the Spot item.
 * Uses deleteOffer — ends live listings and removes the offer object.
 */
export async function endEbayListingForItem(params: {
  itemId: string;
  ebayOfferId?: string | null;
}): Promise<EndEbayListingResult> {
  const sku = spotItemSku(params.itemId);

  if (!canPublishToEbay()) {
    return {
      attempted: false,
      ended: false,
      warning: "eBay sandbox publish is not configured — listing may still be live on eBay.",
    };
  }

  if (!(await isEbaySellerConnected())) {
    return {
      attempted: false,
      ended: false,
      warning: "eBay seller is not connected — listing may still be live on eBay.",
    };
  }

  let offerId = params.ebayOfferId?.trim() || undefined;

  if (!offerId) {
    try {
      const offer = await getFixedPriceOfferForSku(sku);
      offerId = offer?.offerId;
    } catch (error) {
      if (isIgnorableEndError(error)) {
        return { attempted: true, ended: true };
      }
      throw error;
    }
  }

  if (!offerId) {
    try {
      await deleteInventoryItemBySku(sku);
      return { attempted: true, ended: true };
    } catch (error) {
      if (isIgnorableEndError(error)) {
        return { attempted: true, ended: true };
      }
      throw error;
    }
  }

  try {
    await deleteOfferById(offerId);
  } catch (error) {
    if (!isIgnorableEndError(error)) throw error;
  }

  try {
    await deleteInventoryItemBySku(sku);
  } catch (error) {
    if (!isIgnorableEndError(error)) {
      console.warn(`[endEbayListingForItem] inventory delete failed for ${sku}:`, error);
    }
  }

  return { attempted: true, ended: true };
}
