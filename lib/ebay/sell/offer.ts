import type { ListingDraft } from "@prisma/client";
import { EbayApiError } from "@/lib/ebay/fetch/errors";
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

interface GetOffersResponse {
  offers?: Array<{
    offerId?: string;
    format?: string;
    status?: string;
    listing?: { listingId?: string };
  }>;
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

export async function getFixedPriceOfferForSku(sku: string): Promise<{
  offerId: string;
  status?: string;
  listingId?: string;
} | null> {
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
}

function isOfferAlreadyExistsError(error: unknown): boolean {
  return (
    error instanceof Error && /offer entity already exists/i.test(error.message)
  );
}

/** eBay 25713 — offer ended, deleted, or otherwise unusable (common in sandbox after relist cycles). */
function isOfferUnavailableError(error: unknown): boolean {
  if (error instanceof EbayApiError) return error.errorId === 25713;
  return error instanceof Error && /25713|offer is not available/i.test(error.message);
}

async function deleteOfferById(offerId: string): Promise<void> {
  try {
    await ebaySellFetch(`/sell/inventory/v1/offer/${encodeURIComponent(offerId)}`, {
      method: "DELETE",
    });
  } catch (error) {
    if (error instanceof EbayApiError && (error.status === 404 || error.errorId === 25713)) {
      return;
    }
    throw error;
  }
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
  body: ReturnType<typeof buildOfferBody>
): Promise<{ offerId: string; listingId?: string }> {
  let offerId = await createOffer(body);

  try {
    const published = await publishOfferById(offerId);
    return { offerId, listingId: published.listingId };
  } catch (error) {
    if (!isOfferUnavailableError(error)) throw error;
    await deleteOfferById(offerId);
    offerId = await createOffer(body);
    const published = await publishOfferById(offerId);
    return { offerId, listingId: published.listingId };
  }
}

/**
 * Create or reuse a fixed-price offer for the SKU, then publish (idempotent retries).
 * Stale/ended sandbox offers (25713) are deleted and recreated automatically.
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
  const existing = await getFixedPriceOfferForSku(params.sku);

  if (existing?.status === "PUBLISHED" && existing.listingId) {
    return { offerId: existing.offerId, listingId: existing.listingId };
  }

  // Remove unpublished/ended ghost offers so publish does not hit 25713 after delete-relist cycles.
  if (existing?.offerId) {
    await deleteOfferById(existing.offerId);
  }

  try {
    return await createAndPublishFreshOffer(body);
  } catch (error) {
    if (!isOfferAlreadyExistsError(error) && !isOfferUnavailableError(error)) {
      throw error;
    }

    const again = await getFixedPriceOfferForSku(params.sku);
    if (again?.status === "PUBLISHED" && again.listingId) {
      return { offerId: again.offerId, listingId: again.listingId };
    }
    if (again?.offerId) {
      await deleteOfferById(again.offerId);
    }

    return createAndPublishFreshOffer(body);
  }
}
