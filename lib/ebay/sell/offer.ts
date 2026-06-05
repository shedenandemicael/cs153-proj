import type { ListingDraft } from "@prisma/client";
import { parseJsonArray } from "@/lib/utils/json";
import { EBAY_MARKETPLACE_ID } from "../fetch/http";
import { ebaySellFetch } from "./http";
import type { ListingPolicyIds } from "./policies";

interface CreateOfferResponse {
  offerId?: string;
}

interface PublishOfferResponse {
  offerId?: string;
  listingId?: string;
  warnings?: Array<{ message?: string }>;
}

export async function createAndPublishOffer(params: {
  sku: string;
  draft: ListingDraft;
  merchantLocationKey: string;
  policies: ListingPolicyIds;
}): Promise<{ offerId: string; listingId?: string }> {
  if (!params.draft.categoryId?.trim()) {
    throw new Error("Listing draft is missing eBay categoryId — re-run the agent or set category manually.");
  }

  const price = params.draft.buyItNowPrice ?? params.draft.startingPrice;
  const bullets = parseJsonArray(params.draft.descriptionBullets);
  const listingDescription = bullets.length > 0 ? bullets.join("\n") : params.draft.conditionDesc;

  const created = await ebaySellFetch<CreateOfferResponse>("/sell/inventory/v1/offer", {
    method: "POST",
    body: {
      sku: params.sku,
      marketplaceId: EBAY_MARKETPLACE_ID,
      format: "FIXED_PRICE",
      categoryId: params.draft.categoryId,
      listingDescription,
      merchantLocationKey: params.merchantLocationKey,
      listingPolicies: {
        fulfillmentPolicyId: params.policies.fulfillmentPolicyId,
        paymentPolicyId: params.policies.paymentPolicyId,
        returnPolicyId: params.policies.returnPolicyId,
      },
      pricingSummary: {
        price: {
          value: price.toFixed(2),
          currency: "USD",
        },
      },
      availableQuantity: 1,
      includeCatalogProductDetails: false,
    },
  });

  const offerId = created.offerId;
  if (!offerId) {
    throw new Error("eBay did not return an offerId after createOffer");
  }

  const published = await ebaySellFetch<PublishOfferResponse>(
    `/sell/inventory/v1/offer/${encodeURIComponent(offerId)}/publish`,
    { method: "POST" }
  );

  return {
    offerId,
    listingId: published.listingId,
  };
}
