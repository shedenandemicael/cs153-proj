import { canPublishToEbay } from "@/lib/utils/ebay-config";
import { isEbaySellerConnected } from "../oauth/user-token";
import { spotItemSku } from "./item-sku";
import {
  deleteInventoryItemSafe,
  deleteOfferSafe,
  resetEbaySkuForPublish,
  safeGetFixedPriceOfferForSku,
} from "./offer-cleanup";

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

/**
 * End the eBay sandbox listing (if any) before removing the Spot item.
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

  const storedOfferId = params.ebayOfferId?.trim();
  if (storedOfferId) {
    await deleteOfferSafe(storedOfferId);
  }

  await resetEbaySkuForPublish(sku);

  const remaining = await safeGetFixedPriceOfferForSku(sku);
  if (remaining?.status === "PUBLISHED" && remaining.listingId) {
    await deleteOfferSafe(remaining.offerId);
    await deleteInventoryItemSafe(sku);
  }

  return { attempted: true, ended: true };
}
