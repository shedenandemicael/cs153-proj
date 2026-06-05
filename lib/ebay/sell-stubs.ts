/**
 * @deprecated Use publishListingToEbay from lib/ebay/sell/publish-listing.ts
 * Kept as thin re-exports for existing imports.
 */
export {
  publishListingToEbay,
  getEbaySellStatus,
  type PublishListingResult,
  type EbaySellStatus,
} from "./sell/publish-listing";

export interface OfferDraftResult {
  offerId: string;
  status: string;
  listingUrl?: string;
  listingId?: string;
}

/** @deprecated Use publishListingToEbay */
export async function createInventoryItemStub(_sku: string): Promise<{ sku: string }> {
  throw new Error("createInventoryItemStub is deprecated — use publishListingToEbay");
}

/** @deprecated Use publishListingToEbay */
export async function createOfferDraftStub(_sku: string): Promise<OfferDraftResult> {
  throw new Error("createOfferDraftStub is deprecated — use publishListingToEbay");
}
