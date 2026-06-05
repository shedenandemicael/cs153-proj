import type { ListingDraft } from "@prisma/client";
import { parseJsonArray } from "@/lib/utils/json";
import { EBAY_MARKETPLACE_ID } from "../fetch/http";
import {
  deleteOfferSafe,
  isOfferUnavailableError,
  resetEbayOffersForSku,
  safeGetFixedPriceOfferForSku,
} from "./offer-cleanup";
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

export interface OfferPublishParams {
  sku: string;
  draft: ListingDraft;
  merchantLocationKey: string;
  policies: ListingPolicyIds;
}

function buildOfferBody(params: OfferPublishParams) {
  const price = params.draft.buyItNowPrice ?? params.draft.startingPrice;
  const bullets = parseJsonArray(params.draft.descriptionBullets);
  const listingDescription =
    bullets.length > 0 ? bullets.join("\n") : params.draft.conditionDesc;

  return {
    sku: params.sku,
    marketplaceId: EBAY_MARKETPLACE_ID,
    format: "FIXED_PRICE" as const,
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
  };
}

/** @deprecated Use safeGetFixedPriceOfferForSku */
export async function getFixedPriceOfferForSku(sku: string) {
  return safeGetFixedPriceOfferForSku(sku);
}

function isOfferAlreadyExistsError(error: unknown): boolean {
  return (
    error instanceof Error && /offer entity already exists/i.test(error.message)
  );
}

async function publishOfferById(offerId: string): Promise<PublishOfferResponse> {
  return ebaySellFetch<PublishOfferResponse>(
    `/sell/inventory/v1/offer/${encodeURIComponent(offerId)}/publish`,
    { method: "POST" }
  );
}

async function createOffer(body: ReturnType<typeof buildOfferBody>): Promise<string> {
  const created = await ebaySellFetch<CreateOfferResponse>("/sell/inventory/v1/offer", {
    method: "POST",
    body,
  });

  if (!created.offerId) {
    throw new Error("eBay did not return an offerId after createOffer");
  }

  return created.offerId;
}

async function createAndPublishFreshOffer(
  sku: string,
  body: ReturnType<typeof buildOfferBody>
): Promise<{ offerId: string; listingId?: string }> {
  let offerId = await createOffer(body);

  try {
    const published = await publishOfferById(offerId);
    return { offerId, listingId: published.listingId };
  } catch (error) {
    if (!isOfferUnavailableError(error)) throw error;
    await deleteOfferSafe(offerId);
    await resetEbayOffersForSku(sku);
    offerId = await createOffer(body);
    const published = await publishOfferById(offerId);
    return { offerId, listingId: published.listingId };
  }
}

/**
 * Create a fixed-price offer for the SKU and publish it.
 * Clears stale sandbox offers/inventory first (fixes eBay error 25713).
 */
export async function createAndPublishOffer(
  params: OfferPublishParams
): Promise<{ offerId: string; listingId?: string }> {
  if (!params.draft.categoryId?.trim()) {
    throw new Error(
      "Listing draft is missing eBay categoryId — re-run the agent or set category manually."
    );
  }

  const body = buildOfferBody(params);

  try {
    return await createAndPublishFreshOffer(params.sku, body);
  } catch (error) {
    if (!isOfferAlreadyExistsError(error) && !isOfferUnavailableError(error)) {
      throw error;
    }

    await resetEbayOffersForSku(params.sku);
    return createAndPublishFreshOffer(params.sku, body);
  }
}
