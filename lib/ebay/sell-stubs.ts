/**
 * Sell-side stubs — not used for market research fetch.
 * Publish flow only; replace when implementing listing creation.
 */

export interface OfferDraftResult {
  offerId: string;
  status: string;
  listingUrl?: string;
}

export async function createInventoryItemStub(sku: string): Promise<{ sku: string }> {
  console.warn("[sell-stubs] createInventoryItem:", sku);
  return { sku };
}

export async function createOfferDraftStub(sku: string): Promise<OfferDraftResult> {
  console.warn("[sell-stubs] createOfferDraft:", sku);
  return {
    offerId: `sandbox-offer-${Date.now()}`,
    status: "UNPUBLISHED",
  };
}
